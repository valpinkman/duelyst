#!/usr/bin/env node
/*
 * Emit `declare X: any;` for properties a class only ever assigns via
 * `this.prototype.X = ...` inside `static initClass()`.
 *
 * WHY `declare` AND NOT A CLASS FIELD: these are PROTOTYPE defaults, and that
 * is load-bearing. The SDK's serialization is structural - an object's own
 * enumerable properties ARE the wire format for game state and replays (see
 * AGENTS.md). A class field would create an OWN property on every instance and
 * silently change what gets serialized. `declare` is type-only and emits no
 * JavaScript at all, so the prototype stays the prototype.
 *
 * Usage: node scripts/codemods/declare-prototype-props.mjs <files...>
 */
import { readFileSync, writeFileSync } from 'node:fs';

let changed = 0;
for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8');

  // property names this file assigns onto a prototype
  const names = [...src.matchAll(/this\.prototype\.([A-Za-z_$][\w$]*)\s*=/g)].map((m) => m[1]);
  const unique = [...new Set(names)];
  if (!unique.length) continue;

  /*
   * Two shapes appear, both from decaffeinate:
   *   class Foo extends Bar {           (a plain declaration)
   *   Foo = class Foo extends Bar {     (an assignment, used when initClass
   *                                      had to run at definition time)
   *
   * A file may hold several nested classes, each with its own initClass, so
   * prototype assignments are attributed to the class whose body encloses
   * them rather than to the file as a whole.
   */
  const classMatches = [...src.matchAll(/(?:^class\s+|=\s*class\s+)([A-Za-z_$][\w$]*)[^{]*\{/gm)];
  if (!classMatches.length) continue;

  const already = new Set([...src.matchAll(/^\s*declare\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]));

  // walk braces from each class body opening to find where it ends
  const bodyEnd = (start) => {
    let depth = 0;
    for (let i = start; i < src.length; i += 1) {
      if (src[i] === '{') depth += 1;
      else if (src[i] === '}') {
        depth -= 1;
        if (depth === 0) return i;
      }
    }
    return src.length;
  };

  // innermost-first, so nested classes claim their own properties
  const classes = classMatches
    .map((m) => {
      // indentation of the line the class opens on - LEADING WHITESPACE ONLY.
      // (`Foo = class Foo {` matches from the `=`, so the text before it on
      // that line is `  Foo `, not indentation.)
      const line = (src.slice(0, m.index).match(/[^\n]*$/) || [''])[0];
      return {
        name: m[1],
        open: m.index + m[0].length - 1,
        indent: (line.match(/^\s*/) || [''])[0],
      };
    })
    .map((c) => ({ ...c, end: bodyEnd(c.open) }))
    .sort((a, b) => a.end - a.open - (b.end - b.open)); // smallest body first = innermost

  const claimed = new Set();
  const inserts = [];
  for (const c of classes) {
    const own = [];
    for (const m of src.matchAll(/this\.prototype\.([A-Za-z_$][\w$]*)\s*=/g)) {
      if (m.index > c.open && m.index < c.end && !claimed.has(m.index) && !already.has(m[1])) {
        own.push(m[1]);
        claimed.add(m.index);
      }
    }
    const uniqueOwn = [...new Set(own)];
    if (uniqueOwn.length) {
      inserts.push({
        at: c.open + 1,
        text: `\n${uniqueOwn.map((n) => `${c.indent}  declare ${n}: any;`).join('\n')}`,
      });
      console.log(`${file}: ${c.name} -> ${uniqueOwn.length}`);
    }
  }
  if (!inserts.length) continue;

  let out = src;
  for (const ins of inserts.sort((a, b) => b.at - a.at)) {
    out = out.slice(0, ins.at) + ins.text + out.slice(ins.at);
  }
  writeFileSync(file, out);
  changed += 1;
}
console.log(`${changed} file(s) changed`);
