/*
 * Covers server/lib/download_html.ts.
 *
 * This code only runs in staging/production - development serves the built
 * index.html straight out of dist/src - so no suite, no boot, and no e2e run
 * ever touches it. That is precisely why it is tested here: the `request` ->
 * fetch port would otherwise have shipped on the strength of "it looks right",
 * and its failure mode is the API refusing to boot.
 *
 * The gzip case matters specifically: the old call passed `{ gzip: true }` to
 * `request`, and fetch handles that transparently rather than by option, so
 * the behaviour needs to be demonstrated rather than assumed.
 */
const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
const { expect } = require('chai');
const fs = require('fs');
const os = require('os');
const http = require('http');
const zlib = require('zlib');
const Logger = require('@duelyst/common/logger');
const downloadHtml = require('apps/server/lib/download_html');

Logger.enabled = false;

const BODY = '<html><body>index for duelyst</body></html>';

/** Promise wrapper so tests can await the callback-style API. */
function download(origin, destination) {
  return new Promise((resolve) => {
    downloadHtml(origin, destination, (err) => resolve(err));
  });
}

describe('downloadHtml', () => {
  let server;
  let baseUrl;
  let tmpDir;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dl-html-'));
    server = http.createServer((req, res) => {
      if (req.url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(BODY);
      } else if (req.url === '/gzipped.html') {
        // what the CDN actually served, and why the old code passed gzip:true
        res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Encoding': 'gzip' });
        res.end(zlib.gzipSync(BODY));
      } else if (req.url === '/missing.html') {
        res.writeHead(404);
        res.end('nope');
      } else {
        res.writeHead(500);
        res.end('boom');
      }
    });
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    if (server)
      await new Promise((resolve) => {
        server.close(resolve);
      });
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('expect a 200 to be written to disk verbatim', async () => {
    const dest = path.join(tmpDir, 'index.html');
    const err = await download(`${baseUrl}/index.html`, dest);
    expect(err).to.equal(null);
    expect(fs.readFileSync(dest, 'utf8')).to.equal(BODY);
  });

  it('expect a gzipped response to be decompressed transparently', async () => {
    const dest = path.join(tmpDir, 'gzipped.html');
    const err = await download(`${baseUrl}/gzipped.html`, dest);
    expect(err).to.equal(null);
    // decompressed, not raw gzip bytes
    expect(fs.readFileSync(dest, 'utf8')).to.equal(BODY);
  });

  it('expect a non-200 to report the status and not write the file', async () => {
    const dest = path.join(tmpDir, 'missing.html');
    const err = await download(`${baseUrl}/missing.html`, dest);
    expect(err).to.be.an('error');
    expect(err.message).to.contain('404');
    expect(fs.existsSync(dest)).to.equal(false);
  });

  it('expect a connection failure to surface as an error, not a throw', async () => {
    const dest = path.join(tmpDir, 'unreachable.html');
    // port 1 is reserved and refuses connections
    const err = await download('http://127.0.0.1:1/index.html', dest);
    expect(err).to.be.an('error');
  });
});
