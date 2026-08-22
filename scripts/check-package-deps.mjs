#!/usr/bin/env node
/*
 * The two in-place workspace packages have a layering, and it is worth a gate:
 * app/sdk and app/common used to require each other, which made them one
 * package with a directory between them (docs/REORG_AUDIT.md). The cycle was
 * broken on 2026-08-21 by moving three files; this keeps it broken.
 *
 *   @duelyst/common  -> nothing else (a leaf)
 *   @duelyst/sdk     -> app/common and app/data only
 *
 * Checks root-absolute specifiers (`require('app/x')`) and relative ones that
 * climb out of the package (`require('../../x')`) -- the first attempt at this
 * move rewrote only the root-absolute form and left 11 relative requires
 * pointing at a file that had moved, so both forms are checked here.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const RULES = {
  'app/common': { allow: [] },
  'app/data': { allow: [] },
  'packages/sdk': { allow: ['app/common', 'app/data'] },
};

/*
 * `git ls-files` rather than a directory walk, which is what keeps app/data
 * honest: its tracked source is a leaf, and the only thing reaching back into
 * app/sdk is the generated app/data/packages.js -- gitignored, so unlisted, so
 * not checked. That is the right answer rather than an accident: packages.js is
 * a build artifact of scripts/generate_packages.js, which reads app/sdk off
 * disk. The cycle exists in the artifact, never in the source.
 */
const files = execFileSync('git', ['ls-files', 'packages/sdk', 'app/common', 'app/data'], {
  encoding: 'utf8',
})
  .split('\n')
  .filter((f) => f.endsWith('.ts') || f.endsWith('.js'));

const violations = [];
for (const file of files) {
  const pkg = Object.keys(RULES).find((p) => file.startsWith(`${p}/`));
  if (!pkg) continue;
  const { allow } = RULES[pkg];
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/require\(['"]([^'"]+)['"]\)/g)) {
    const spec = m[1];
    let target = null;
    if (spec.startsWith('.')) {
      // resolve relative specifiers against the file, then see where they land
      const resolved = path.normalize(path.join(path.dirname(file), spec));
      // `require('..')` from packages/sdk/giftCrates lands on the package itself: still inside
      //
      // Any landing spot outside the package counts, not just one under app/. This
      // used to be gated on `resolved.startsWith('app/')`, and the packages/sdk move
      // walked straight through the hole: six spells kept `require('../../common/config')`,
      // which had resolved to app/common/config from app/sdk but resolves to the
      // nonexistent packages/common/config from packages/sdk. The gate passed; 101
      // test files did not.
      if (resolved !== pkg && !resolved.startsWith(`${pkg}/`)) target = resolved;
    } else if (spec.startsWith('app/') && !spec.startsWith(`${pkg}/`)) {
      target = spec;
    }
    if (!target) continue;
    if (!allow.some((a) => target === a || target.startsWith(`${a}/`))) {
      const rule = allow.length
        ? `${pkg} may only reach ${allow.join(', ')}`
        : `${pkg} must not reach outside itself`;
      violations.push(`${file}: requires '${spec}' (${rule})`);
    }
  }
}

if (violations.length) {
  console.error(`package layering violated (${violations.length}):\n`);
  for (const v of violations) console.error(`  ${v}`);
  console.error(
    '\nSee docs/REORG_AUDIT.md. If the layering itself should change, change RULES here too.',
  );
  process.exit(1);
}
console.log(`package layering OK (${files.length} files checked)`);
