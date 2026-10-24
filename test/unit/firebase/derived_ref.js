/*
 * Regression: sending a friend a game invite threw
 *   TypeError: this.firebase.ref is not a function
 * from backfire's destroy(), which left the invite live in Firebase and parked
 * both players on "waiting" after deck selection. backfire was written for
 * firebase 2.x, where `ref()` was a METHOD; games_manager hands the model a
 * DERIVED ref (`new Firebase(url).push()`), which only has the v3+ property.
 *
 * backfire is gone (#51) and apps/client/ui/extensions/firebase_sync.ts never
 * calls `.ref()`; these pin that the shapes that broke still work, and that
 * writes reach the node they should.
 */

const { expect } = require('chai');

const DATABASE_URL = 'https://duelyst-derived-ref-test-default-rtdb.firebaseio.com/';
process.env.FIREBASE_URL = DATABASE_URL;

global.window = global;
global._ = require('underscore');
global.Backbone = require('backbone');

const {
  child,
  dbRef,
  getFirebaseDatabase,
  onValue,
  orderByChild,
  push,
  query,
  set,
  startAt,
} = require('@duelyst/client/firebase');
const { goOffline } = require('firebase/database');
// no network in a unit test: writes queue locally instead of dialling out
goOffline(getFirebaseDatabase());

const DuelystFirebase = require('@duelyst/client/ui/extensions/duelyst_firebase');

// what is stored at a location, from the SDK's local cache (compat's once('value'))
function stored(ref) {
  return new Promise((resolve) =>
    onValue(ref, (snapshot) => resolve(snapshot.val()), { onlyOnce: true }),
  );
}

describe('synced models on a derived firebase ref', () => {
  const baseUrl = DATABASE_URL + 'matchmaking/test/invites/to/player-1/';

  it('expect a derived ref to have no callable .ref (the shape that broke)', () => {
    const derived = push(dbRef(baseUrl));
    expect(typeof derived.ref).to.equal('object');
  });

  it('expect set() and destroy({}) on a model built from .push() to reach that node', async () => {
    const inviteRef = push(dbRef(baseUrl));
    set(inviteRef, { status: 'sent' });
    const model = new DuelystFirebase.Model(null, { firebase: inviteRef });

    model.set('status', 'cancelled');
    expect(await stored(dbRef(inviteRef.toString()))).to.deep.equal({
      status: 'cancelled',
    });
    // this is the exact call GamesManager.cancelInvite makes
    expect(() => model.destroy({})).to.not.throw();
    expect(await stored(dbRef(inviteRef.toString()))).to.equal(null);
  });

  it('expect destroy() on a model built from .child() not to throw', () => {
    const childRef = child(dbRef(DATABASE_URL), 'system-status');
    const model = new DuelystFirebase.Model({ status: 'sent' }, { firebase: childRef });

    expect(() => model.destroy({})).to.not.throw();
  });

  it('expect toRef to resolve a query to the Reference under it, and a Reference to itself', () => {
    const reference = child(dbRef(DATABASE_URL), 'notifications');
    const notifications = query(reference, orderByChild('created_at'), startAt(0));

    // a query is not a Reference (no parent, so no child() through it);
    // writes go through the Reference underneath
    expect('parent' in notifications).to.equal(false);
    expect('parent' in DuelystFirebase.toRef(notifications)).to.equal(true);
    expect(DuelystFirebase.toRef(notifications).toString()).to.equal(reference.toString());
    expect(DuelystFirebase.toRef(reference)).to.equal(reference);
  });
});
