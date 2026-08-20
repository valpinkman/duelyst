#!/usr/bin/env node
/*
 * Fail if a file uses a utils_promise export without binding it.
 *
 * This exists because the bluebird codemods inserted requires by matching the
 * MODULE PATH rather than the BINDING, so a file that already had
 * `const { onType } = require('.../utils_promise')` was treated as "already
 * imported" and never got `PromiseUtils`. The result was
 * `ReferenceError: PromiseUtils is not defined` at runtime - green lint, green
 * unit tests, 500s in production. The mirror image happened on the client with
 * `onType`.
 *
 * Cheap to check, and it catches the whole class rather than the two instances
 * that happened to be exercised.
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const files = execSync(
  "grep -rlE '(PromiseUtils\\.|catch\\(onType\\()' app server worker test --include='*.ts' --include='*.js' | grep -v app/vendor",
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean)
  // the module that DEFINES these shows them in its own doc comments
  .filter((f) => !f.endsWith('app/common/utils/utils_promise.ts'));

const problems = [];
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  if (/PromiseUtils\./.test(src) && !/(?:const|var|let)\s+PromiseUtils\s*=/.test(src)) {
    problems.push(`${file}: uses PromiseUtils.* without binding it`);
  }
  if (
    /catch\(onType\(/.test(src) &&
    !/(?:const|var|let)\s*\{[^}]*\bonType\b[^}]*\}\s*=/.test(src) &&
    !/PromiseUtils\.onType/.test(src)
  ) {
    problems.push(`${file}: uses onType() without binding it`);
  }
}

if (problems.length) {
  console.error('utils_promise bindings missing:');
  problems.forEach((p) => console.error(`  ${p}`));
  process.exit(1);
}
console.log(`utils_promise bindings OK (${files.length} files checked)`);
