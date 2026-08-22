#!/usr/bin/env node
/*
 * Fail if TypeScript reports ANY TS2304 ("Cannot find name").
 *
 * TS2304 is not typing noise in this codebase -- it is a list of identifiers
 * that do not exist, i.e. ReferenceErrors waiting to happen. Sweeping them
 * found 26 real bugs (missing requires that killed the login-achievements job,
 * an undeclared variable on a common GameLayer path, three SDK gameplay bugs,
 * and more). eslint cannot help: `no-undef` is off for .ts, as
 * typescript-eslint recommends, so TypeScript is the ONLY thing that sees them.
 *
 * The count is now zero, which makes it a ratchet worth enforcing. It is
 * enforced because it already failed once the other way: a codemod that merged
 * two state objects removed a declaration and left one write behind, and the
 * regression shipped -- typecheck would have caught it, but nothing ran
 * typecheck.
 *
 * The rest of the typecheck backlog is deliberately NOT gated; only TS2304.
 */
import { execFileSync } from 'node:child_process';

let output = '';
try {
  output = execFileSync('pnpm', ['exec', 'tsc', '-p', 'tsconfig.json', '--noEmit'], {
    encoding: 'utf8',
  });
} catch (e) {
  output = `${e.stdout || ''}${e.stderr || ''}`;
}

const hits = output.split('\n').filter((l) => /error TS2304:/.test(l));
if (hits.length) {
  console.error(`TS2304 "Cannot find name" -- ${hits.length} undefined identifier(s).`);
  console.error('Each one is a ReferenceError waiting to happen; eslint cannot see these.\n');
  for (const h of hits.slice(0, 40)) console.error(`  ${h}`);
  if (hits.length > 40) console.error(`  ... and ${hits.length - 40} more`);
  process.exit(1);
}
console.log('no undefined names (TS2304 = 0)');
