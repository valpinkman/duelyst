#!/usr/bin/env node
/*
 * kue's chained builder -> the BullMQ-backed Jobs.enqueue().
 *
 *   Jobs.create('t', {...}).removeOnComplete(true).save()
 *     -> Jobs.enqueue('t', {...}, { removeOnComplete: true })
 *   Jobs.create('t', {...}).delay(N).removeOnComplete(true).ttl(T).save()
 *     -> Jobs.enqueue('t', {...}, { delay: N, removeOnComplete: true, ttl: T })
 *
 * The create() call spans many lines (the payload is a big object literal), so
 * the argument list is located by PAREN MATCHING rather than a regex -- a regex
 * over multi-line calls is how the earlier `.delay()` damage happened.
 *
 * Only fully-recognised chains are rewritten. Anything ending in `.save(cb)` or
 * left unsaved (the game server holds those to attach completion listeners) is
 * reported and skipped for hand conversion, rather than guessed at.
 */
import fs from 'node:fs';
import { parse } from '@typescript-eslint/parser';

const matchParen = (src, open) => {
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '(') depth += 1;
    else if (src[i] === ')') { depth -= 1; if (depth === 0) return i; }
  }
  return -1;
};

let converted = 0; const skipped = [];

for (const file of process.argv.slice(2)) {
  const before = fs.readFileSync(file, 'utf8');
  let out = ''; let cursor = 0; let i = 0; let touched = false;

  while ((i = before.indexOf('Jobs.create(', cursor)) !== -1) {
    const open = before.indexOf('(', i);
    const close = matchParen(before, open);
    if (close === -1) break;

    const args = before.slice(open + 1, close).replace(/,\s*$/, '');   // drop trailing comma
    // consume the chain that follows
    let j = close + 1;
    const opts = [];
    let ok = true;
    for (;;) {
      const rest = before.slice(j);
      const m = rest.match(/^\s*\.(delay|removeOnComplete|ttl|priority|attempts)\(/);
      if (m) {
        const aOpen = j + rest.indexOf('(', m[0].length - 1);
        const aClose = matchParen(before, aOpen);
        opts.push(`${m[1]}: ${before.slice(aOpen + 1, aClose).trim()}`);
        j = aClose + 1;
        continue;
      }
      const s = rest.match(/^\s*\.save\(\s*\)/);
      if (s) { j += rest.indexOf(')', rest.indexOf('.save(')) + 1; break; }
      ok = false; break;                       // .save(cb), or no .save at all
    }

    if (!ok) {
      // Emit everything up to and including this call before moving on. Failing
      // to do so silently DELETES the skipped region from the output, which is
      // exactly what the first version of this codemod did.
      skipped.push(`${file}: unrecognised chain near offset ${i}`);
      out += before.slice(cursor, close + 1);
      cursor = close + 1;
      continue;
    }

    out += before.slice(cursor, i);
    out += `Jobs.enqueue(${args}, { ${opts.join(', ')} })`;
    cursor = j;
    converted += 1; touched = true;
  }

  if (!touched) continue;
  out += before.slice(cursor);

  // Guard: never write output that does not parse, and never write output that
  // is dramatically shorter than the input (the signature of dropped regions).
  try { parse(out, { range: true }); } catch (e) {
    console.error(`  !! ${file}: output does not parse, skipping (${e.message})`);
    continue;
  }
  if (out.length < before.length * 0.9) {
    console.error(`  !! ${file}: output shrank ${before.length} -> ${out.length} chars, skipping`);
    continue;
  }
  fs.writeFileSync(file, out);
  console.log(`  ${file}`);
}

console.log(`\n${converted} chain(s) converted`);
for (const s of skipped) console.log(`  SKIPPED (hand-convert) ${s}`);
