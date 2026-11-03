const { expect } = require('chai');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/*
 * The before/after screenshot comparison (test/e2e/visual/compare.mjs, issue
 * #71), exercised on synthetic images. The gate's negative test: a changed
 * region, a resized frame and a screen missing on one side must each fail,
 * and identical captures must pass. A noise capture raises a screen's limit
 * to twice its own noise, never lowers it.
 */

const W = 100;
const H = 50;

describe('visual compare', () => {
  let PNG;
  let compareDirs;
  let diffImages;
  let work;

  beforeAll(async () => {
    ({ PNG } = await import('pngjs'));
    ({ compareDirs, diffImages } = await import('../../e2e/visual/compare.mjs'));
  });

  beforeEach(() => {
    work = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-compare-'));
    for (const d of ['before', 'after', 'noise']) fs.mkdirSync(path.join(work, d));
  });

  afterEach(() => fs.rmSync(work, { recursive: true, force: true }));

  /** A grey image with an optional black box of `box` = [x, y, w, h]. */
  function image({ width = W, height = H, box = null } = {}) {
    const png = new PNG({ width, height });
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const inBox =
          box && x >= box[0] && x < box[0] + box[2] && y >= box[1] && y < box[1] + box[3];
        png.data.fill(inBox ? 0 : 128, i, i + 3);
        png.data[i + 3] = 255;
      }
    }
    return png;
  }

  const write = (dir, name, png) =>
    fs.writeFileSync(path.join(work, dir, `${name}.png`), PNG.sync.write(png));

  const run = (opts) =>
    compareDirs(...['before', 'after', 'diff'].map((d) => path.join(work, d)), opts);

  it('passes identical captures at 0 %', () => {
    write('before', '01-Screen', image());
    write('after', '01-Screen', image());
    const { rows, failures } = run();
    expect(failures).to.equal(0);
    expect(rows[0].percent).to.equal(0);
    expect(fs.existsSync(path.join(work, 'diff', '01-Screen.strip.png'))).to.be.true;
    expect(fs.readFileSync(path.join(work, 'diff', 'report.md'), 'utf8')).to.contain(
      '| 01-Screen | 0.000 % |',
    );
  });

  it('fails a style change: a 10x10 box in 100x50 is 2 %', () => {
    write('before', '01-Screen', image());
    write('after', '01-Screen', image({ box: [10, 10, 10, 10] }));
    const { rows, failures } = run();
    expect(failures).to.equal(1);
    expect(rows[0].percent).to.be.closeTo(2, 1e-9);
    expect(rows[0].fail).to.be.true;
  });

  it('passes a change under --max-diff', () => {
    write('before', '01-Screen', image());
    write('after', '01-Screen', image({ box: [0, 0, 1, 1] }));
    const { rows, failures } = run({ maxDiff: 0.5 });
    expect(rows[0].percent).to.be.closeTo(0.02, 1e-9);
    expect(failures).to.equal(0);
  });

  it('holds a .dom image to the tighter --max-diff-dom floor', () => {
    // 8 px of 5000 is 0.16 %: passes on a whole frame, fails on a .dom image
    // (on the real stack a line of text turning red and moving down was 0.15 %)
    for (const name of ['01-Screen', '01-Screen.dom']) {
      write('before', name, image());
      write('after', name, image({ box: [0, 0, 8, 1] }));
    }
    const { rows, failures } = run();
    expect(rows.find((r) => r.name === '01-Screen').fail).to.be.false;
    const dom = rows.find((r) => r.name === '01-Screen.dom');
    expect(dom.limit).to.equal(0.05);
    expect(dom.fail).to.be.true;
    expect(failures).to.equal(1);
  });

  it('fails a resized frame, even when the overlap matches', () => {
    write('before', '01-Screen', image());
    write('after', '01-Screen', image({ height: H + 1 }));
    const { rows, failures } = run({ maxDiff: 100 });
    expect(rows[0].sizeChanged).to.be.true;
    expect(failures).to.equal(1);
  });

  it('fails a screen that exists on one side only', () => {
    write('before', '01-Screen', image());
    write('before', '02-Other', image());
    write('after', '01-Screen', image());
    const { rows, failures } = run();
    expect(failures).to.equal(1);
    expect(rows.find((r) => r.name === '02-Other').missing).to.equal('after');
  });

  it('raises the limit to twice the noise floor, and only raises it', () => {
    write('before', '01-Screen', image());
    write('noise', '01-Screen', image({ box: [0, 0, 10, 10] })); // 2 % noise
    write('after', '01-Screen', image({ box: [50, 0, 15, 10] })); // 3 % diff
    const noisy = run({ noiseDir: path.join(work, 'noise') });
    expect(noisy.rows[0].noise).to.be.closeTo(2, 1e-9);
    expect(noisy.rows[0].limit).to.be.closeTo(4, 1e-9);
    expect(noisy.failures).to.equal(0);

    write('noise', '01-Screen', image()); // no noise: the floor is --max-diff
    expect(run({ noiseDir: path.join(work, 'noise') }).rows[0].limit).to.equal(0.5);
  });

  it('diffImages ignores sub-threshold colour shifts', () => {
    const a = image();
    const b = image();
    b.data[0] = 129; // one channel of one pixel, by 1
    expect(diffImages(a, b).changed).to.equal(0);
  });
});
