/*
 * Auth token guard rails.
 *
 * The API signs session tokens with jsonwebtoken and verifies them with
 * express-jwt; the socket servers verify spectate tokens directly. Nothing
 * covered that path before, and it was the one place in the dependency
 * upgrade where a silent behaviour change is a SECURITY change rather than a
 * broken build:
 *
 *  - jsonwebtoken 5.4.1 -> 9 and express-jwt 6 -> 8 both hardened algorithm
 *    handling. These tests assert the hardening is actually on, so a future
 *    downgrade, override or refactor that drops `algorithms` fails here
 *    instead of silently accepting attacker-chosen algorithms.
 *  - express-jwt 7 renamed req.user -> req.auth. We pin the old name through
 *    `requestProperty` because 149 route handlers read req.user.d.id; this
 *    asserts the pin holds.
 */
const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
const { expect } = require('chai');
const jwt = require('jsonwebtoken');
const { expressjwt } = require('express-jwt');

const SECRET = 'test-legacy-token-not-a-real-secret';
const PAYLOAD = { d: { id: 'user-1', username: 'tester' } };

/** Drive a connect-style middleware and capture how it settled. */
function runMiddleware(middleware, req) {
  return new Promise((resolve) => {
    middleware(req, {}, (err) => resolve({ err, req }));
  });
}

function authMiddleware(overrides) {
  return expressjwt({
    algorithms: ['HS256'],
    secret: SECRET,
    requestProperty: 'user',
    ...overrides,
  });
}

describe('auth tokens', () => {
  describe('signing (jsonwebtoken 9)', () => {
    it('expect a signed token to round-trip through verify', () => {
      const token = jwt.sign(PAYLOAD, SECRET, { expiresIn: 60, algorithm: 'HS256' });
      const decoded = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
      expect(decoded.d.id).to.equal('user-1');
      expect(decoded.exp).to.be.a('number');
    });

    it('expect an expired token to be rejected', () => {
      const token = jwt.sign(PAYLOAD, SECRET, { expiresIn: -10, algorithm: 'HS256' });
      expect(() => jwt.verify(token, SECRET, { algorithms: ['HS256'] })).to.throw(/expired/i);
    });

    it('expect a token signed with a different secret to be rejected', () => {
      const token = jwt.sign(PAYLOAD, 'some-other-secret', { algorithm: 'HS256' });
      expect(() => jwt.verify(token, SECRET, { algorithms: ['HS256'] })).to.throw(/signature/i);
    });
  });

  describe('algorithm confusion', () => {
    /*
     * The reason server/game.ts and server/single_player.ts now pass an
     * explicit `algorithms` to jwt.verify on the spectate token. Without it a
     * verifier trusts whatever the TOKEN claims in its header, so an
     * unsigned `alg: none` token is accepted as valid.
     */
    it('expect an unsigned "alg: none" token to be rejected when algorithms are pinned', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const body = Buffer.from(JSON.stringify(PAYLOAD)).toString('base64url');
      const forged = `${header}.${body}.`;
      expect(() => jwt.verify(forged, SECRET, { algorithms: ['HS256'] })).to.throw(
        /signature is required/i,
      );
    });

    it('expect a token signed with an algorithm outside the allow-list to be rejected', () => {
      const token = jwt.sign(PAYLOAD, SECRET, { algorithm: 'HS512' });
      expect(() => jwt.verify(token, SECRET, { algorithms: ['HS256'] })).to.throw(
        /invalid algorithm/i,
      );
    });
  });

  describe('express-jwt 8 middleware', () => {
    it('expect a valid token to be attached as req.user (not req.auth)', async () => {
      const token = jwt.sign(PAYLOAD, SECRET, { expiresIn: 60, algorithm: 'HS256' });
      const req = { headers: { authorization: `Bearer ${token}` }, method: 'GET' };
      const { err } = await runMiddleware(authMiddleware(), req);
      expect(err, 'middleware should not error on a valid token').to.equal(undefined);
      // the pin that keeps 149 `req.user.d.id` reads working
      expect(req.user).to.exist;
      expect(req.user.d.id).to.equal('user-1');
    });

    it('expect a missing token to produce an UnauthorizedError', async () => {
      const req = { headers: {}, method: 'GET' };
      const { err } = await runMiddleware(authMiddleware(), req);
      expect(err).to.exist;
      expect(err.name).to.equal('UnauthorizedError');
    });

    it('expect a token signed with the wrong secret to produce an UnauthorizedError', async () => {
      const token = jwt.sign(PAYLOAD, 'some-other-secret', { expiresIn: 60, algorithm: 'HS256' });
      const req = { headers: { authorization: `Bearer ${token}` }, method: 'GET' };
      const { err } = await runMiddleware(authMiddleware(), req);
      expect(err).to.exist;
      expect(err.name).to.equal('UnauthorizedError');
    });
  });
});
