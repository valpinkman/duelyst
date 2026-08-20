#!/usr/bin/env node
/*
 * `const bag = {...}` -> `const bag: Record<string, any> = {...}`
 *
 * By far the largest slice of the typecheck backlog is
 * "Property 'x' does not exist on type '{}'": ~1,700 errors from untyped
 * scratch objects that are built up field by field. TypeScript infers the
 * empty-object type at the declaration and rejects every later assignment.
 *
 * DRIVEN BY THE DIAGNOSTICS, not by a blanket sweep. It reads the compiler's
 * own output, resolves each error position back to the receiver identifier
 * (`foo` in `foo.bar = 1`), and annotates only those declarations. Annotating
 * every `= {}` in the repo would also silence places where TypeScript is
 * inferring a real shape and would have caught a genuine mistake.
 *
 * The annotation is erased at compile time and emits NOTHING at runtime, which
 * matters more here than usual: these bags include `_chainState` objects and
 * SDK scratch state, and this codebase's wire format is its instance property
 * layout (see AGENTS.md). A `declare`/type-only change cannot alter it.
 *
 * Usage: node scripts/codemods/annotate-empty-object-bags.mjs <typecheck.log>
 */
import { readFileSync, writeFileSync } from 'node:fs';

const log = readFileSync(process.argv[2], 'utf8');

// file(line,col): error TS2339: Property 'x' does not exist on type '{}'.
// any object-literal type: '{}' or '{ id: any; ... }'
const RE =
  /^(.+?)\((\d+),(\d+)\): error TS2339: Property '([^']+)' does not exist on type '\{[^']*\}'\.$/gm;

const wanted = new Map(); // file -> Set(receiver identifiers)
let m;
while ((m = RE.exec(log)) !== null) {
  const [, file, lineNo, colNo] = m;
  let lines;
  try {
    lines = readFileSync(file, 'utf8').split('\n');
  } catch {
    continue;
  }
  const line = lines[Number(lineNo) - 1];
  if (line == null) continue;

  // col points at the property name; walk back over `.` and the identifier
  const before = line.slice(0, Number(colNo) - 1);
  const recv = before.match(/([A-Za-z_$][\w$]*)\s*\.\s*$/);
  if (!recv) continue; // computed access, `this.x`, chains
  if (!wanted.has(file)) wanted.set(file, new Set());
  wanted.get(file).add(recv[1]);
}

let files = 0;
let annotated = 0;
const unresolved = [];
for (const [file, names] of wanted) {
  let src = readFileSync(file, 'utf8');
  const before = src;
  for (const name of names) {
    // a declaration initialised with an object literal and not already annotated
    const decl = new RegExp(`\\b(const|let|var)\\s+(${name})\\s*=\\s*\\{`, 'g');
    if (!decl.test(src)) {
      unresolved.push(`${file}: ${name}`);
      continue;
    }
    decl.lastIndex = 0;
    src = src.replace(decl, (_all, kw, id) => `${kw} ${id}: Record<string, any> = {`);
    annotated += 1;
  }
  if (src !== before) {
    writeFileSync(file, src);
    files += 1;
  }
}

console.log(`annotated ${annotated} declaration(s) across ${files} file(s)`);
if (unresolved.length) {
  console.log(`${unresolved.length} receiver(s) not declared as a bare \`= {}\` (left alone):`);
  for (const u of unresolved.slice(0, 15)) console.log(`  ${u}`);
}
