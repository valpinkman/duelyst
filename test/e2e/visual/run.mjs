#!/usr/bin/env node
/*
 * Before/after screenshot comparison of two refs (issue #71). Required for
 * every screen port: docs/BACKBONE_REMOVAL_PLAN.md §3.5.
 *
 *   node test/e2e/visual/run.mjs --before <ref> --after <ref> --dist <dir> \
 *        [--base-url http://localhost:3000] [--screens A,B] [--user <name>] \
 *        [--work <dir>] [--noise] [--keep]
 *
 * `--dist` is the directory the running stack serves the client from: the
 * api container bind-mounts `./dist/src` (docker-compose.yaml), so it is
 * `<checkout the stack was started from>/dist/src`. Only the client bundle
 * changes between the two captures; the backend, the database and the
 * account stay the same.
 *
 * For each ref it makes a detached worktree under --work, installs and builds
 * it with the calling environment (so source the same .env.dev the stack
 * uses, with its API URL and ports: the build bakes them in), and keeps the
 * built dist/src. Then it:
 *   1. backs up what --dist holds,
 *   2. swaps the after build in and, without --user, sets up a fresh account
 *      (registered, tutorial skipped, rift run claimed),
 *   3. swaps the before build in and captures (twice with --noise),
 *   4. swaps the after build in and captures,
 *   5. restores --dist, compares, and exits non-zero if any screen is over
 *      its limit (compare.mjs).
 * Results land in <work>/{before,before-repeat,after,diff}; diff/report.md is
 * the table for the PR, diff/*.strip.png the images.
 *
 * Never point the stack at .env (production): the setup account and its rift
 * run are written to whatever Firebase/Postgres the stack uses.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { capture } from './capture.mjs';
import { compareDirs } from './compare.mjs';

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    if (key === 'noise' || key === 'keep') flags[key] = true;
    else flags[key] = argv[++i];
  }
  return flags;
}

const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

/** Replace the contents of `dir` (not the directory: it is a bind mount) with `from`. */
function swapInto(dir, from) {
  for (const entry of fs.readdirSync(dir)) fs.rmSync(path.join(dir, entry), { recursive: true });
  fs.cpSync(from, dir, { recursive: true });
}

/** Build `sha` in a worktree under `work`; returns the built dist/src, cached per sha. */
function buildAt(sha, work) {
  const built = path.join(work, `dist-${sha.slice(0, 10)}`);
  if (fs.existsSync(path.join(built, 'index.html'))) return built;
  const tree = path.join(work, `wt-${sha.slice(0, 10)}`);
  if (!fs.existsSync(tree)) git('worktree', 'add', '--detach', tree, sha);
  console.log(`\n== building ${sha.slice(0, 10)} in ${tree}`);
  sh('pnpm', ['install', '--frozen-lockfile', '--prefer-offline'], { cwd: tree });
  sh('pnpm', ['build'], { cwd: tree });
  fs.cpSync(path.join(tree, 'dist', 'src'), built, { recursive: true });
  return built;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (!flags.before || !flags.after || !flags.dist) {
    console.error('usage: run.mjs --before <ref> --after <ref> --dist <served dist/src dir>');
    process.exit(2);
  }
  if (!fs.existsSync(flags.dist)) throw new Error(`--dist ${flags.dist} does not exist`);
  const baseUrl = flags['base-url'] ?? process.env.E2E_BASE_URL ?? 'http://localhost:3000';
  const screens = flags.screens ? flags.screens.split(',') : null;
  const work = path.resolve(
    flags.work ?? fs.mkdtempSync(path.join(os.tmpdir(), 'duelyst-visual-')),
  );
  fs.mkdirSync(work, { recursive: true });
  const before = git('rev-parse', `${flags.before}^{commit}`);
  const after = git('rev-parse', `${flags.after}^{commit}`);
  console.log(`before ${before}\nafter  ${after}\nwork   ${work}`);

  const beforeBuild = buildAt(before, work);
  const afterBuild = buildAt(after, work);

  const backup = path.join(work, 'dist-served-backup');
  fs.rmSync(backup, { recursive: true, force: true });
  fs.cpSync(flags.dist, backup, { recursive: true });
  let failures = 0;
  try {
    let user = flags.user;
    if (!user) {
      user = `vis${Date.now().toString(36)}`.slice(0, 18);
      swapInto(flags.dist, afterBuild);
      await capture({ baseUrl, user, setup: true });
    }
    const dir = (name) => path.join(work, name);
    for (const d of ['before', 'before-repeat', 'after', 'diff']) {
      fs.rmSync(dir(d), { recursive: true, force: true });
    }

    swapInto(flags.dist, beforeBuild);
    await capture({ baseUrl, user, out: dir('before'), screens });
    if (flags.noise) await capture({ baseUrl, user, out: dir('before-repeat'), screens });
    swapInto(flags.dist, afterBuild);
    await capture({ baseUrl, user, out: dir('after'), screens });

    ({ failures } = compareDirs(dir('before'), dir('after'), dir('diff'), {
      noiseDir: flags.noise ? dir('before-repeat') : null,
    }));
    process.stdout.write(`\n${fs.readFileSync(path.join(dir('diff'), 'report.md'), 'utf8')}`);
    console.log(`\naccount ${user}; ${failures} over the limit; results in ${dir('diff')}`);
  } finally {
    swapInto(flags.dist, backup);
    if (!flags.keep) {
      for (const sha of [before, after]) {
        const tree = path.join(work, `wt-${sha.slice(0, 10)}`);
        if (fs.existsSync(tree)) git('worktree', 'remove', '--force', tree);
      }
    }
  }
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
