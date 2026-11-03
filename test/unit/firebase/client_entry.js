/*
 * apps/client/firebase.ts, the client's one Firebase entry point (#9): the
 * refs it hands out. No network.
 */

const { expect } = require('chai');

const DATABASE_URL = 'https://duelyst-client-entry-test-default-rtdb.firebaseio.com/';
process.env.FIREBASE_URL = DATABASE_URL;

const { child, dbRef, getFirebaseDatabase } = require('@duelyst/client/firebase');
const { goOffline } = require('firebase/database');

goOffline(getFirebaseDatabase());

describe('client firebase entry point', () => {
  it('expect dbRef() to be the root, and a path to be under it', () => {
    expect(dbRef().toString()).to.equal(DATABASE_URL);
    expect(dbRef('users/me/presence').toString()).to.equal(DATABASE_URL + 'users/me/presence');
  });

  it('expect a full URL to address the same node as its path, doubled slashes and all', () => {
    // call sites concatenated `FIREBASE_URL + '/users/' + id` under v2
    expect(dbRef(DATABASE_URL + '/users/me').toString()).to.equal(dbRef('users/me').toString());
    expect(dbRef(DATABASE_URL + '.info/connected').toString()).to.equal(
      DATABASE_URL + '.info/connected',
    );
  });

  it('expect segments to be applied with child(), as the .child() chains they replace', () => {
    expect(dbRef('user-progression', 'me', 'game-counter').toString()).to.equal(
      child(child(dbRef('user-progression'), 'me'), 'game-counter').toString(),
    );
    // v2's .child(undefined) threw; a concatenated path would not have
    expect(() => dbRef('user-progression', undefined, 'game-counter')).to.throw();
  });

  it('expect a URL into another database to be refused, as refFromURL did', () => {
    expect(() => dbRef('https://some-other-db.firebaseio.com/users/me')).to.throw();
  });
});
