#!/usr/bin/env node
/**
 * Turborepo 2 runs tasks in strict env mode: a task only sees the environment
 * variables declared in turbo.json. Every setting in config/config.js is bound
 * to an env var and is resolved into the client bundle at build time, so an
 * undeclared one does not fail loudly -- it silently falls back to the schema
 * default and bakes the wrong value (a production build pointed at a localhost
 * API_URL, say) into a bundle that looks fine.
 *
 * This asserts turbo.json's globalEnv still covers every env binding the
 * convict schema declares, plus the vars the build orchestrator reads directly.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const convict = readFileSync(join(root, 'config/config.js'), 'utf8');
const fromConvict = [...convict.matchAll(/env:\s*['"]([A-Z_][A-Z0-9_]*)['"]/g)].map((m) => m[1]);

const buildFiles = ['tools/build/build-client.mjs', 'vite.config.client.mjs'];
const fromBuild = buildFiles.flatMap((f) =>
  [...readFileSync(join(root, f), 'utf8').matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g)].map(
    (m) => m[1],
  ),
);

const required = [...new Set([...fromConvict, ...fromBuild])].sort();

// turbo.json is JSONC.
const turbo = JSON.parse(
  readFileSync(join(root, 'turbo.json'), 'utf8').replace(/^\s*\/\/.*$/gm, ''),
);
const declared = new Set(turbo.globalEnv ?? []);

const missing = required.filter((name) => {
  if (declared.has(name)) return false;
  for (const pattern of declared) {
    if (pattern.endsWith('*') && name.startsWith(pattern.slice(0, -1))) return false;
  }
  return true;
});

if (missing.length > 0) {
  console.error(
    `turbo.json globalEnv is missing ${missing.length} variable(s) that the build reads.\n` +
      `Under strict env mode these are stripped, and the value silently falls back to its default:\n` +
      missing.map((m) => `  ${m}`).join('\n'),
  );
  process.exit(1);
}

console.log(`turbo.json globalEnv covers all ${required.length} build-visible env vars.`);
