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

const firebase = require('firebase/compat/app');
require('firebase/compat/database');

const DATABASE_URL = 'https://duelyst-derived-ref-test-default-rtdb.firebaseio.com/';

if (!firebase.apps.length) firebase.initializeApp({ databaseURL: DATABASE_URL });
const database = firebase.database();
// no network in a unit test: writes queue locally instead of dialling out
database.goOffline();

global.window = global;
global._ = require('underscore');
global.Backbone = require('backbone');
// mirror apps/client/firebase.ts
global.Firebase = function (url) {
  return database.refFromURL(url || DATABASE_URL);
};
global.Firebase.ServerValue = firebase.database.ServerValue;

const DuelystFirebase = require('@duelyst/client/ui/extensions/duelyst_firebase');

async function stored(ref) {
  return (await ref.once('value')).val();
}

describe('synced models on a derived firebase ref', () => {
  const baseUrl = DATABASE_URL + 'matchmaking/test/invites/to/player-1/';

  it('expect a derived ref to have no callable .ref (the shape that broke)', () => {
    const derived = new global.Firebase(baseUrl).push();
    expect(typeof derived.ref).to.equal('object');
  });

  it('expect set() and destroy({}) on a model built from .push() to reach that node', async () => {
    const inviteRef = new global.Firebase(baseUrl).push();
    inviteRef.set({ status: 'sent' });
    const model = new DuelystFirebase.Model(null, { firebase: inviteRef });

    model.set('status', 'cancelled');
    expect(await stored(new global.Firebase(inviteRef.toString()))).to.deep.equal({
      status: 'cancelled',
    });
    // this is the exact call GamesManager.cancelInvite makes
    expect(() => model.destroy({})).to.not.throw();
    expect(await stored(new global.Firebase(inviteRef.toString()))).to.equal(null);
  });

  it('expect destroy() on a model built from .child() not to throw', () => {
    const childRef = new global.Firebase(DATABASE_URL).child('system-status');
    const model = new DuelystFirebase.Model({ status: 'sent' }, { firebase: childRef });

    expect(() => model.destroy({})).to.not.throw();
  });

  it('expect toRef to resolve a query to the Reference under it, and a Reference to itself', () => {
    const reference = new global.Firebase(DATABASE_URL).child('notifications');
    const query = reference.orderByChild('created_at').startAt(0);

    // a query has no child(); writes go through the Reference underneath
    expect(typeof query.child).to.equal('undefined');
    expect(typeof DuelystFirebase.toRef(query).child).to.equal('function');
    expect(DuelystFirebase.toRef(query).toString()).to.equal(reference.toString());
    expect(DuelystFirebase.toRef(reference)).to.equal(reference);
  });
});
