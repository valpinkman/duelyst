#!/usr/bin/env node
/*
 * Emit `declare X: any;` / `declare static X: any;` for class members that are
 * only ever assigned dynamically, so TypeScript stops reporting TS2339 on them.
 *
 * Driven by the compiler's own diagnostics: it reads typecheck output for
 * "Property 'X' does not exist on type 'C'" (instance) and "... on type
 * 'typeof C'" (static), then declares exactly those members on class C.
 *
 * WHY `declare` AND NOT A CLASS FIELD -- the same reason as
 * declare-prototype-props.mjs, and it is load-bearing here. These classes carry
 * prototype defaults and statics assigned in decaffeinate's `initClass()`. A
 * real class field would create an OWN property on every instance, and in this
 * codebase an object's own enumerable properties ARE the wire format for game
 * state and replays (AGENTS.md). `declare` is type-only and emits no
 * JavaScript, so the prototype stays the prototype and the wire shape is
 * untouched.
 *
 * Usage: node scripts/codemods/declare-class-members.mjs <typecheck.log>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from '@typescript-eslint/parser';

const log = readFileSync(process.argv[2], 'utf8');
const RE = /^(.+?)\(\d+,\d+\): error TS2339: Property '([^']+)' does not exist on type '(typeof )?([A-Za-z_$][\w$]*)'\.$/gm;

// file -> class -> { instance:Set, static:Set }
const want = new Map();
let m;
while ((m = RE.exec(log)) !== null) {
  const [, file, prop, isStatic, cls] = m;
  if (!want.has(file)) want.set(file, new Map());
  const byClass = want.get(file);
  if (!byClass.has(cls)) byClass.set(cls, { instance: new Set(), static: new Set() });
  byClass.get(cls)[isStatic ? 'static' : 'instance'].add(prop);
}

let files = 0; let declared = 0; const skipped = [];
for (const [file, byClass] of want) {
  let src;
  try { src = readFileSync(file, 'utf8'); } catch { continue; }
  const before = src;

  for (const [cls, members] of byClass) {
    // find `class <cls>` and the opening brace of its body
    const decl = new RegExp(`\\bclass\\s+${cls}\\b[^{]*\\{`);
    const hit = decl.exec(src);
    if (!hit) { skipped.push(`${file}: no class ${cls}`); continue; }

    const insertAt = hit.index + hit[0].length;
    const indentMatch = src.slice(0, hit.index).match(/([ \t]*)$/);
    const indent = `${indentMatch ? indentMatch[1] : ''}  `;

    const lines = [];
    for (const p of [...members.static].sort()) {
      if (new RegExp(`declare\\s+static\\s+${p}\\b`).test(src)) continue;
      lines.push(`${indent}declare static ${p}: any;`);
    }
    for (const p of [...members.instance].sort()) {
      if (new RegExp(`declare\\s+${p}\\b`).test(src)) continue;
      lines.push(`${indent}declare ${p}: any;`);
    }
    if (!lines.length) continue;

    src = `${src.slice(0, insertAt)}\n${lines.join('\n')}${src.slice(insertAt)}`;
    declared += lines.length;
  }

  if (src === before) continue;
  try { parse(src, { range: true }); } catch (e) {
    skipped.push(`${file}: output does not parse (${e.message})`);
    continue;
  }
  writeFileSync(file, src);
  files += 1;
}

console.log(`declared ${declared} member(s) across ${files} file(s)`);
for (const s of skipped.slice(0, 12)) console.log(`  skipped ${s}`);
