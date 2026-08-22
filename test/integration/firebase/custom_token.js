/*
 * Firebase custom tokens (plan 9.1).
 *
 * The client currently authenticates to Firebase with the same HS256 JWT it
 * sends to our API: Firebase 2.x accepted tokens signed with the database
 * secret and handed their `d` payload to the security rules as `auth`. No SDK
 * past 2.x understands that, so the migration off firebase@2 needs a real
 * custom token instead.
 *
 * What matters for 9.2 is the SHAPE, because the rules are rewritten against
 * it: `uid` becomes `auth.uid` (replacing the 86 `auth.id` reads) and custom
 * claims become `auth.token.*`. If the subject ever stopped being the user id
 * the rules would silently stop matching, so that is asserted here rather
 * than discovered in production.
 */
const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
const { expect } = require('chai');
const config = require('../../../config/config');
const DuelystFirebase = require('apps/server/lib/duelyst_firebase_module');

const firebaseUrl = config.get('firebase.url');

/** Decode a JWT segment without verifying (we only care about the shape). */
function decode(token, segment) {
  return JSON.parse(Buffer.from(token.split('.')[segment], 'base64url').toString('utf8'));
}

describe('Firebase.CustomToken', () => {
  const userId = '-TestUserId_9_1';

  it('expect a custom token to be signed RS256 by the service account', () =>
    DuelystFirebase.createCustomToken(userId, { username: 'tester' }, firebaseUrl).then((token) => {
      expect(token).to.be.a('string');
      const header = decode(token, 0);
      const body = decode(token, 1);
      // legacy tokens were HS256 with the database secret; these must not be
      expect(header.alg).to.equal('RS256');
      expect(body.iss).to.equal(body.sub);
      expect(body.iss).to.contain('gserviceaccount.com');
      expect(body.aud).to.contain('identitytoolkit');
    }));

  it('expect uid to carry the user id, since the rules read it as auth.uid', () =>
    DuelystFirebase.createCustomToken(userId, { username: 'tester' }, firebaseUrl).then((token) => {
      const body = decode(token, 1);
      // this is the value 9.2's rules compare against; `auth.id` today
      expect(body.uid).to.equal(userId);
    }));

  it('expect extra claims to land under claims, which rules read as auth.token.*', () =>
    DuelystFirebase.createCustomToken(userId, { username: 'tester' }, firebaseUrl).then((token) => {
      const body = decode(token, 1);
      expect(body.claims).to.eql({ username: 'tester' });
      // uid is reserved and must NOT be duplicated into claims
      expect(body.claims.uid).to.not.exist;
    }));

  it('expect a null username to be accepted (users can exist without one)', () =>
    DuelystFirebase.createCustomToken(userId, { username: null }, firebaseUrl).then((token) => {
      expect(decode(token, 1).claims).to.eql({ username: null });
    }));
});
