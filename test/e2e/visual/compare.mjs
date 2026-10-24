#!/usr/bin/env node
/*
 * Compare two capture directories written by ./capture.mjs (issue #71).
 *
 *   node test/e2e/visual/compare.mjs <before-dir> <after-dir> --out <dir>
 *        [--threshold 0.1] [--max-diff 0.5] [--noise <before-repeat-dir>]
 *
 * For every PNG present in either directory it reports the share of pixels
 * that differ (pixelmatch, anti-aliasing ignored), and writes:
 *   <out>/<name>.diff.png    the pixelmatch diff, changed pixels in red
 *   <out>/<name>.strip.png   before | after | diff, side by side, for a PR
 *   <out>/report.json        every number below
 *   <out>/report.md          the same as a table, ready to paste on an issue
 *
 * A screen fails when its diff exceeds --max-diff percent, or when it exists
 * on one side only (a screen that stopped rendering is the loudest change
 * there is). With --noise, the before build captured a second time sets each
 * screen's noise floor, and a screen fails only when it exceeds
 * max(--max-diff, 2 x its noise). The exit code is the number of failures,
 * capped at 1, so a script or CI step can gate on it.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

/** Read a PNG into { width, height, data }. */
export function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

/** Pad an image to width x height with opaque magenta, so a resize shows as change. */
function padTo(img, width, height) {
  if (img.width === width && img.height === height) return img;
  const out = new PNG({ width, height });
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = 255;
    out.data[i + 1] = 0;
    out.data[i + 2] = 255;
    out.data[i + 3] = 255;
  }
  PNG.bitblt(img, out, 0, 0, Math.min(img.width, width), Math.min(img.height, height), 0, 0);
  return out;
}

/**
 * Diff two decoded PNGs. Returns the changed-pixel count and percentage and
 * the diff image. Images of different sizes are compared on the larger box,
 * the missing area counting as changed.
 */
export function diffImages(before, after, { threshold = 0.1 } = {}) {
  const width = Math.max(before.width, after.width);
  const height = Math.max(before.height, after.height);
  const a = padTo(before, width, height);
  const b = padTo(after, width, height);
  const diff = new PNG({ width, height });
  const changed = pixelmatch(a.data, b.data, diff.data, width, height, {
    threshold,
    includeAA: false,
    alpha: 0.2,
  });
  return {
    changed,
    total: width * height,
    percent: (changed / (width * height)) * 100,
    sizeChanged: before.width !== after.width || before.height !== after.height,
    diff,
    a,
    b,
  };
}

/** before | after | diff in one image, with a 4px gutter. */
export function strip(images) {
  const gutter = 4;
  const height = Math.max(...images.map((i) => i.height));
  const width = images.reduce((w, i) => w + i.width, 0) + gutter * (images.length - 1);
  const out = new PNG({ width, height });
  out.data.fill(255);
  let x = 0;
  for (const img of images) {
    PNG.bitblt(img, out, 0, 0, img.width, img.height, x, 0);
    x += img.width + gutter;
  }
  return out;
}

function pngNames(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.png'));
}

/**
 * Compare `beforeDir` with `afterDir`, writing diff and strip images into
 * `outDir`. Returns { rows, failures }. `noiseDir`, when given, is the before
 * build captured a second time.
 */
export function compareDirs(beforeDir, afterDir, outDir, opts = {}) {
  const { threshold = 0.1, maxDiff = 0.5, noiseDir = null } = opts;
  fs.mkdirSync(outDir, { recursive: true });
  const names = [...new Set([...pngNames(beforeDir), ...pngNames(afterDir)])].sort();
  const rows = [];
  for (const file of names) {
    const name = file.replace(/\.png$/, '');
    const beforeFile = path.join(beforeDir, file);
    const afterFile = path.join(afterDir, file);
    if (!fs.existsSync(beforeFile) || !fs.existsSync(afterFile)) {
      rows.push({
        name,
        percent: 100,
        noise: null,
        limit: maxDiff,
        fail: true,
        missing: fs.existsSync(beforeFile) ? 'after' : 'before',
      });
      continue;
    }
    const before = readPng(beforeFile);
    const after = readPng(afterFile);
    const result = diffImages(before, after, { threshold });

    let noise = null;
    const noiseFile = noiseDir && path.join(noiseDir, file);
    if (noiseFile && fs.existsSync(noiseFile)) {
      noise = diffImages(before, readPng(noiseFile), { threshold }).percent;
    }
    const limit = noise == null ? maxDiff : Math.max(maxDiff, noise * 2);

    fs.writeFileSync(path.join(outDir, `${name}.diff.png`), PNG.sync.write(result.diff));
    fs.writeFileSync(
      path.join(outDir, `${name}.strip.png`),
      PNG.sync.write(strip([result.a, result.b, result.diff])),
    );
    rows.push({
      name,
      percent: result.percent,
      changed: result.changed,
      sizeChanged: result.sizeChanged,
      noise,
      limit,
      fail: result.sizeChanged || result.percent > limit,
    });
  }
  const failures = rows.filter((r) => r.fail).length;
  fs.writeFileSync(
    path.join(outDir, 'report.json'),
    JSON.stringify({ threshold, maxDiff, rows, failures }, null, 2),
  );
  fs.writeFileSync(path.join(outDir, 'report.md'), toMarkdown(rows, { threshold, maxDiff }));
  return { rows, failures };
}

const pct = (n) => (n == null ? '-' : `${n.toFixed(3)} %`);

/** The report as a Markdown table. */
export function toMarkdown(rows, { threshold, maxDiff }) {
  const lines = [
    `pixelmatch threshold ${threshold}; a screen fails above max(${maxDiff} %, 2 x noise).`,
    '',
    '| Screen | Diff | Noise | Limit | Result |',
    '| --- | --- | --- | --- | --- |',
  ];
  for (const r of rows) {
    const result = r.missing
      ? `FAIL (missing ${r.missing})`
      : r.sizeChanged
        ? 'FAIL (size changed)'
        : r.fail
          ? 'FAIL'
          : 'ok';
    lines.push(`| ${r.name} | ${pct(r.percent)} | ${pct(r.noise)} | ${pct(r.limit)} | ${result} |`);
  }
  return lines.join('\n') + '\n';
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = argv[++i];
    else positional.push(argv[i]);
  }
  return { positional, flags };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [beforeDir, afterDir] = positional;
  if (!beforeDir || !afterDir || !flags.out) {
    console.error('usage: compare.mjs <before-dir> <after-dir> --out <dir> [--noise <dir>]');
    process.exit(2);
  }
  const { rows, failures } = compareDirs(beforeDir, afterDir, flags.out, {
    threshold: flags.threshold != null ? Number(flags.threshold) : undefined,
    maxDiff: flags['max-diff'] != null ? Number(flags['max-diff']) : undefined,
    noiseDir: flags.noise ?? null,
  });
  process.stdout.write(fs.readFileSync(path.join(flags.out, 'report.md'), 'utf8'));
  console.log(`\n${rows.length} images compared, ${failures} over the limit -> ${flags.out}`);
  process.exit(failures > 0 ? 1 : 0);
}
