/*
 * Dissolve decaffeinate's `static initClass()` indirection
 * (MODERNIZATION_PLAN.md Phase 5-TS, step T1).
 *
 * decaffeinate compiles CoffeeScript's class-body assignments into
 *
 *     class Foo {
 *       static initClass() {
 *         this.type = 'Foo';            // STATIC  (factory dispatch)
 *         this.prototype.type = 'Foo';  // PROTOTYPE (serialized instance data)
 *       }
 *     }
 *     Foo.initClass();
 *
 * which TypeScript cannot see through (`Property 'type' does not exist on
 * type 'typeof Foo'`). This codemod removes the indirection.
 *
 * WIRE-FORMAT CRITICAL: `this.prototype.X = v` must stay a PROTOTYPE
 * assignment. Turning it into a class field would make it an own instance
 * property, which changes what JSON.stringify emits for every game object
 * (see the wire-format guard tests). So:
 *
 *   - `this.prototype.X = v`  ->  `Foo.prototype.X = v;` after the class
 *   - `this.X = <literal>`    ->  `static X = <literal>;` in the class body
 *                                 (literals only: zero evaluation-order risk,
 *                                  and this is what TS needs to see for the
 *                                  enum/lookup classes)
 *   - `this.X = <expression>` ->  `Foo.X = <expression>;` after the class,
 *                                 preserving the original evaluation order
 *
 * Files whose initClass body contains anything other than assignments to
 * `this.*` are skipped untouched and reported.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const espree = require(require.resolve('espree', { paths: [require.resolve('eslint')] }));

function isLiteralish(node) {
  switch (node.type) {
    case 'Literal':
      return true;
    case 'UnaryExpression':
      return (node.operator === '-' || node.operator === '+') && isLiteralish(node.argument);
    case 'ArrayExpression':
      return node.elements.every((e) => e === null || isLiteralish(e));
    case 'ObjectExpression':
      return node.properties.every((p) => p.type === 'Property' && !p.computed && isLiteralish(p.value));
    case 'TemplateLiteral':
      return node.expressions.length === 0;
    default:
      return false;
  }
}

// Render a node's source with every ThisExpression inside it replaced by the
// class name (needed when a statement is hoisted out of the class body).
function renderWithThisAs(src, node, className) {
  const thisNodes = [];
  const collect = (n) => {
    if (!n || typeof n.type !== 'string') return;
    // do not descend into nested non-arrow functions: their `this` is dynamic
    // and keeps its original meaning after the move
    if (n.type === 'FunctionExpression' || n.type === 'FunctionDeclaration') return;
    if (n.type === 'ThisExpression') thisNodes.push(n);
    for (const key of Object.keys(n)) {
      const v = n[key];
      if (Array.isArray(v)) v.forEach(collect);
      else if (v && typeof v.type === 'string') collect(v);
    }
  };
  collect(node);
  let out = src.slice(node.range[0], node.range[1]);
  const base = node.range[0];
  for (const t of thisNodes.sort((a, b) => b.range[0] - a.range[0])) {
    out = out.slice(0, t.range[0] - base) + className + out.slice(t.range[1] - base);
  }
  return out;
}

const skipped = [];
let changedFiles = 0;
let staticFields = 0;
let protoAssigns = 0;
let deferredStatics = 0;

for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('static initClass()')) continue;

  let ast;
  try {
    ast = espree.parse(src, { ecmaVersion: 2022, sourceType: 'script', range: true });
  } catch (err) {
    skipped.push(`${file}: parse error ${err.message}`);
    continue;
  }

  // find top-level class declarations that own a static initClass
  const classes = [];
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if ((node.type === 'ClassDeclaration' || node.type === 'ClassExpression') && node.id) {
      const init = node.body.body.find((m) => m.type === 'MethodDefinition' && m.static
        && m.key.type === 'Identifier' && m.key.name === 'initClass');
      if (init) classes.push({ node, init });
    }
    for (const key of Object.keys(node)) {
      const v = node[key];
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v.type === 'string') visit(v);
    }
  };
  visit(ast);
  if (classes.length === 0) continue;

  const edits = [];
  let bad = null;

  for (const { node: klass, init } of classes) {
    const name = klass.id.name;
    const statics = [];   // source text for class-body static fields
    const after = [];     // source text for post-class assignments

    for (const stmt of init.value.body.body) {
      if (stmt.type !== 'ExpressionStatement' || stmt.expression.type !== 'AssignmentExpression'
        || stmt.expression.operator !== '=') {
        bad = `unsupported statement (${stmt.type})`;
        break;
      }
      const { left, right } = stmt.expression;
      // The RHS can reference `this` too (e.g.
      // `this.prototype.getTarget = this.prototype.getCard`). Once the
      // statement moves outside the class body, `this` no longer means the
      // class, so rewrite those references to the class name as well.
      const rhs = renderWithThisAs(src, right, name);
      if (left.type === 'MemberExpression' && !left.computed
        && left.object.type === 'MemberExpression' && !left.object.computed
        && left.object.object.type === 'ThisExpression'
        && left.object.property.name === 'prototype') {
        // this.prototype.X = v  -> stays on the prototype
        after.push(`${name}.prototype.${left.property.name} = ${rhs};`);
        protoAssigns += 1;
      } else if (left.type === 'MemberExpression' && !left.computed
        && left.object.type === 'ThisExpression') {
        if (isLiteralish(right)) {
          statics.push(`  static ${left.property.name} = ${rhs};`);
          staticFields += 1;
        } else {
          after.push(`${name}.${left.property.name} = ${rhs};`);
          deferredStatics += 1;
        }
      } else {
        bad = `unsupported assignment target (${left.type})`;
        break;
      }
    }
    if (bad) break;

    // replace the initClass method with the static field declarations
    edits.push({
      start: init.range[0],
      end: init.range[1],
      text: statics.join('\n').replace(/^ {2}/, ''),
    });
    // append post-class assignments right after the class declaration
    if (after.length > 0) {
      edits.push({ start: klass.range[1], end: klass.range[1], text: `\n${after.join('\n')}` });
    }
  }

  if (bad) {
    skipped.push(`${file}: ${bad}`);
    continue;
  }

  // drop the `Foo.initClass();` call statements (some carry a trailing
  // comment that decaffeinate moved off a class property - keep it)
  const callRe = /^[ \t]*[\w$]+\.initClass\(\);?[ \t]*(\/\/[^\n]*)?\r?\n/gm;
  let out = src;
  edits.sort((a, b) => b.start - a.start);
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  out = out.replace(callRe, (m, comment) => (comment ? `${comment}\n` : ''));
  // tidy the decaffeinate suggestion comment about initClass
  out = out.replace(/^ \* DS206: Consider reworking classes to avoid initClass\r?\n/m, '');

  fs.writeFileSync(file, out);
  changedFiles += 1;
}

console.log(`${changedFiles} file(s) rewritten: ${staticFields} static fields, ${deferredStatics} order-preserving statics, ${protoAssigns} prototype assignments`);
if (skipped.length > 0) {
  console.log(`\n${skipped.length} file(s) skipped:`);
  skipped.slice(0, 20).forEach((s) => console.log(`  ${s}`));
}
