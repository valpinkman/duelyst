const { expect } = require('chai');

/*
 * The e2e console filter (test/e2e/helpers/console.mjs), exercised without a
 * browser. Issue #2: a missing image IS a 404, so a blanket 404 allowlist made
 * the e2e net blind to the migration's most likely failure. 404s under
 * resources/ must never be dropped; other dev-server 404s still are.
 */

const MSG_404 = 'Failed to load resource: the server responded with a status of 404 (Not Found)';
const MSG_401 = 'Failed to load resource: the server responded with a status of 401 (Unauthorized)';

describe('e2e console filter', () => {
  let isConsoleNoise;
  let isUnderResources;
  beforeAll(async () => {
    ({ isConsoleNoise, isUnderResources } = await import('../../e2e/helpers/console.mjs'));
  });

  it('never drops a 404 for an asset under resources/', () => {
    expect(isConsoleNoise(MSG_404, 'http://localhost:3000/resources/ui/button_back.png')).to.be
      .false;
    expect(isConsoleNoise(MSG_404, 'http://localhost:3000/resources/tutorial/vignette@2x.png')).to
      .be.false;
  });

  it('still drops dev-server 404s outside resources/', () => {
    expect(
      isConsoleNoise(
        MSG_404,
        'http://localhost:3000/fonts/bootstrap/glyphicons-halflings-regular.woff2',
      ),
    ).to.be.true;
    expect(isConsoleNoise(MSG_404, '')).to.be.true;
  });

  it('keeps the 401 allowance and drops nothing else', () => {
    expect(isConsoleNoise(MSG_401, 'http://localhost:3000/session/username_available')).to.be.true;
    expect(isConsoleNoise('Uncaught TypeError: x is not a function', '')).to.be.false;
  });

  it('matches resources/ by path segment, not by substring', () => {
    expect(isUnderResources('http://localhost:3000/resources/a.png')).to.be.true;
    expect(isUnderResources('resources/a.png')).to.be.true;
    expect(isUnderResources('http://localhost:3000/myresources/a.png')).to.be.false;
    expect(isUnderResources('http://localhost:3000/api/x?next=/resources/a.png')).to.be.false;
  });
});
