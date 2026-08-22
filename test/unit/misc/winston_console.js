/*
 * The winston seam routes console.* through winston. It is OPT-IN
 * (`config.get('winston')` defaults false and no env file enables it), so
 * nothing in CI, the e2e run or normal development ever executes it -- which is
 * exactly how it could break without anyone noticing.
 *
 * The behaviour worth pinning is the arity fix. console.* accepts any number of
 * arguments and formats them like util.format; winston 3's logger takes
 * (message, meta) and would fold every argument after the first into metadata,
 * silently dropping them from the output. server/winston.ts formats through
 * util.format to prevent that, and these tests fail if that ever regresses.
 *
 * Output is captured with a winston Stream transport rather than by stubbing
 * process.stdout.write, because the test runner intercepts stdout itself and
 * the two fight each other.
 */
const path = require('path');
const { Writable } = require('stream');
const winston = require('winston');
const { expect } = require('chai');

require('app-module-path').addPath(path.join(__dirname, '../../../'));

const winstonSeam = require('apps/server/winston');

const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

/** Run `fn` with console.* routed through winston, returning what was logged. */
function captureThroughWinston(fn) {
  const originals = {
    log: console.log,
    debug: console.debug,
    warn: console.warn,
    error: console.error,
  };
  const chunks = [];
  const sink = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(String(chunk));
      cb();
    },
  });

  try {
    const logger = winstonSeam.setup('unit-test');
    logger.clear(); // drop the Console transport
    logger.add(new winston.transports.Stream({ stream: sink }));
    fn();
  } finally {
    Object.assign(console, originals);
  }
  return chunks.join('').replace(ANSI, '');
}

describe('winston console seam', () => {
  it('routes console.log through winston at info level', () => {
    const out = captureThroughWinston(() => console.log('hello'));
    expect(out).to.contain('info');
    expect(out).to.contain('hello');
  });

  // the regression this file exists for
  it('keeps EVERY argument, not just the first', () => {
    const out = captureThroughWinston(() => console.log('multi', 'arg', 42));
    expect(out, 'later arguments must not be swallowed as winston metadata').to.contain(
      'multi arg 42',
    );
  });

  it('applies printf-style formatting like console.* does', () => {
    const out = captureThroughWinston(() => console.log('a %s and %d', 'str', 7));
    expect(out).to.contain('a str and 7');
  });

  it('inspects objects rather than printing [object Object]', () => {
    const out = captureThroughWinston(() => console.log('obj:', { a: 1 }));
    expect(out).to.contain('{ a: 1 }');
    expect(out).to.not.contain('[object Object]');
  });

  it('maps warn and error onto their own levels', () => {
    expect(captureThroughWinston(() => console.warn('careful'))).to.contain('warn');
    expect(captureThroughWinston(() => console.error('broken'))).to.contain('error');
  });

  it('restores the real console afterwards', () => {
    const before = console.log;
    captureThroughWinston(() => console.log('x'));
    expect(console.log).to.equal(before);
  });
});
