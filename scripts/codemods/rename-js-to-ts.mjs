/*
 * Rename .js -> .ts, adding the type-only declarations TypeScript needs
 * (MODERNIZATION_PLAN.md step 5T.2b).
 *
 * After `dissolve-init-class`, class metadata lives in post-class assignments:
 *
 *     class Foo extends Bar {}
 *     Foo.prototype.type = 'Foo';       // instance data (WIRE FORMAT)
 *     Foo.modifierName = i18next.t(…);  // static, order-sensitive
 *
 * TypeScript rejects both ("Property 'type' does not exist on type 'Foo'"),
 * so this codemod inserts `declare` members into the class body:
 *
 *     class Foo extends Bar {
 *       declare type: any;
 *       declare static modifierName: any;
 *     }
 *
 * `declare` members are type-only: TypeScript and esbuild/tsx erase them
 * entirely, emitting NO field initializer. That matters — a real class field
 * would become an own instance property and change the serialized shape of
 * every game object (see the wire-format guard tests).
 *
 * Members already declared in the class body (real fields, methods, getters,
 * or inherited-and-redeclared names) are skipped. `any` is the honest
 * starting type: narrowing them is the incremental typing work that follows.
 *
 * Usage: node scripts/codemods/rename-js-to-ts.mjs <file.js> [...]
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const espree = require(require.resolve('espree', { paths: [require.resolve('eslint')] }));

const skipped = [];
let renamed = 0;
let declaredInstance = 0;
let declaredStatic = 0;

for (const file of process.argv.slice(2)) {
  if (!file.endsWith('.js') || !fs.existsSync(file)) {
    skipped.push(`${file}: not a .js file`);
    continue;
  }
  const src = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = espree.parse(src, { ecmaVersion: 2022, sourceType: 'script', range: true });
  } catch (err) {
    skipped.push(`${file}: parse error ${err.message}`);
    continue;
  }

  // top-level classes in this file, by name
  const classes = new Map();
  for (const node of ast.body) {
    if (node.type === 'ClassDeclaration' && node.id) classes.set(node.id.name, node);
  }

  // collect names assigned onto those classes after the class body
  const wanted = new Map(); // className -> {instance:Set, statics:Set}
  const visitStatement = (node) => {
    if (node.type !== 'ExpressionStatement' || node.expression.type !== 'AssignmentExpression') return;
    const { left } = node.expression;
    if (left.type !== 'MemberExpression' || left.computed) return;
    // Foo.prototype.X = ...
    if (left.object.type === 'MemberExpression' && !left.object.computed
      && left.object.object.type === 'Identifier' && classes.has(left.object.object.name)
      && left.object.property.name === 'prototype') {
      const entry = wanted.get(left.object.object.name) || { instance: new Set(), statics: new Set() };
      entry.instance.add(left.property.name);
      wanted.set(left.object.object.name, entry);
      return;
    }
    // Foo.X = ...
    if (left.object.type === 'Identifier' && classes.has(left.object.name)) {
      const entry = wanted.get(left.object.name) || { instance: new Set(), statics: new Set() };
      entry.statics.add(left.property.name);
      wanted.set(left.object.name, entry);
    }
  };
  ast.body.forEach(visitStatement);

  const edits = [];
  for (const [name, { instance, statics }] of wanted) {
    const klass = classes.get(name);
    // names already present in the class body must not be redeclared
    const existing = new Set();
    for (const m of klass.body.body) {
      if (m.key && m.key.type === 'Identifier') existing.add(`${m.static ? 'static:' : ''}${m.key.name}`);
    }
    const lines = [];
    for (const n of instance) {
      if (existing.has(n)) continue;
      lines.push(`  declare ${n}: any;`);
      declaredInstance += 1;
    }
    for (const n of statics) {
      if (existing.has(`static:${n}`)) continue;
      lines.push(`  declare static ${n}: any;`);
      declaredStatic += 1;
    }
    if (lines.length === 0) continue;
    // insert right after the opening brace of the class body
    edits.push({ at: klass.body.range[0] + 1, text: `\n${lines.join('\n')}\n` });
  }

  let out = src;
  edits.sort((a, b) => b.at - a.at);
  for (const e of edits) out = out.slice(0, e.at) + e.text + out.slice(e.at);

  const target = file.replace(/\.js$/, '.ts');
  fs.writeFileSync(file, out);
  try {
    execFileSync('git', ['mv', file, target], { stdio: 'pipe' });
  } catch {
    // git mv can fail transiently (index lock) - the rename is what matters,
    // git picks it up as a rename at add time anyway
    fs.renameSync(file, target);
  }
  renamed += 1;
}

console.log(`${renamed} file(s) renamed to .ts (${declaredInstance} instance + ${declaredStatic} static declarations added)`);
if (skipped.length > 0) {
  console.log(`${skipped.length} skipped:`);
  skipped.slice(0, 10).forEach((s) => console.log(`  ${s}`));
}
