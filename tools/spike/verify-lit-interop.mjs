/*
 * SPIKE — issue #3. THROWAWAY PROOF, NOT PRODUCTION TOOLING.
 *
 * Answers the one question a green build cannot: does the Lit element in the
 * PRODUCTION bundle actually upgrade and render in a browser?
 *
 * It serves dist/src, loads vendor.js + duelyst.js into headless Chromium the way
 * dist/src/index.html does, and then asks the page four things:
 *   1. did `customElements.define` run — i.e. did the CJS `require()` of an ESM
 *      module execute its side effect at all
 *   2. does the tag, dropped into markup as a string, upgrade to the Lit class
 *   3. did `render()` produce light DOM (no shadow root), per plan §3.1
 *   4. is the reactive machinery alive — set a property, await `updateComplete`,
 *      see the text change. (2) alone would also pass for a dead custom element.
 *
 * The spike is deliberately NOT wired into the build, so a stock bundle does not
 * contain it and this script will say so rather than fail obscurely. To reproduce:
 *
 *   1. add `require('./ui/components/spike/spike-host');` at the top of apps/client/index.ts
 *   2. FIREBASE_URL=https://test-url.firebaseio.com/ pnpm build
 *   3. node tools/spike/verify-lit-interop.mjs
 *   4. remove the line again
 *
 * Delete with the spike.
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const distDir = path.join(rootDir, 'dist/src');

const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>lit interop spike</title></head>
<body>
<script src="/vendor.js"></script>
<script src="/duelyst.js"></script>
</body></html>
`;

const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' };

function serve() {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/harness.html') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(HARNESS);
      return;
    }
    const file = path.join(distDir, path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, ''));
    if (!file.startsWith(distDir) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

if (!existsSync(path.join(distDir, 'duelyst.js'))) {
  console.error('dist/src/duelyst.js missing — run `pnpm build` first');
  process.exit(1);
}

const server = await serve();
const port = server.address().port;
// this sandbox ships a pinned Chromium that predates @playwright/test's expected
// build; point at it rather than downloading one
const executablePath =
  process.env.SPIKE_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(executablePath) ? { executablePath } : {});
const page = await browser.newPage();

const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));

await page.goto(`http://127.0.0.1:${port}/harness.html`, { waitUntil: 'load' });

const result = await page.evaluate(async () => {
  const spike = window.__duelystLitSpike;
  if (!spike) return { reached: false };

  const defined = customElements.get('duelyst-spike-probe');
  const container = spike.mount();
  const el = container.firstElementChild;
  await customElements.whenDefined('duelyst-spike-probe');
  await el.updateComplete;

  const initialText = el.textContent.trim();
  el.label = 'reactive-update';
  await el.updateComplete;

  return {
    reached: true,
    markup: spike.MARKUP,
    registered: Boolean(defined),
    upgraded: Boolean(defined) && el instanceof defined,
    lightDom: el.shadowRoot === null,
    initialText,
    updatedText: el.textContent.trim(),
    outerHTML: container.innerHTML,
  };
});

await browser.close();
server.close();

if (!result.reached) {
  console.error(`
The bundle does not contain the spike — window.__duelystLitSpike is undefined.

This is the expected state of a stock build: the proof is kept out of the shipped
bundle on purpose. To reproduce it, add

    require('./ui/components/spike/spike-host');

at the top of apps/client/index.ts, rebuild, re-run this script, then remove the line again.
`);
  process.exit(2);
}

const checks = [
  ['CJS module executed in the bundle', result.reached === true],
  ['ESM side effect ran (customElements.define)', result.registered === true],
  ['tag in markup upgraded to the Lit class', result.upgraded === true],
  ['rendered into light DOM (no shadow root)', result.lightDom === true],
  ['render() output present', result.initialText === 'lit ok: cjs-require'],
  ['reactive property update re-rendered', result.updatedText === 'lit ok: reactive-update'],
];

console.log('\nlit CJS->ESM interop spike — production bundle, headless chromium\n');
for (const [name, ok] of checks) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
console.log(`\n  rendered: ${result.outerHTML ?? '(nothing)'}`);
if (pageErrors.length) {
  console.log(`\n  page errors during boot (expected without a backend):`);
  for (const e of pageErrors) console.log(`    - ${e.split('\n')[0]}`);
}

const failed = checks.filter(([, ok]) => !ok);
process.exit(failed.length === 0 ? 0 : 1);
