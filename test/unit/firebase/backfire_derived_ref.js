/*
 * Regression: sending a friend a game invite threw
 *   TypeError: this.firebase.ref is not a function
 * from backfire's destroy(), which left the invite live in Firebase and parked
 * both players on "waiting" after deck selection.
 *
 * backfire is written for firebase 2.x, where `ref()` was a METHOD on a ref.
 * From v3 on `.ref` is a getter property. app/firebase.ts patches a callable
 * `ref` onto every ref built by `new Firebase(url)` -- but NOT onto a derived
 * one, and games_manager hands backfire `new Firebase(url).push()`.
 *
 * The nine backfire methods that call the SDK's `.ref()` are create, update,
 * add, remove, destroy, _parseModels, _removeModel and both _updateModel
 * implementations, so this is a class of bug rather than one call site. The fix
 * lives in app/ui/extensions/duelyst_firebase.ts, the single point every
 * backfire model is constructed through.
 */

const { expect } = require('chai');

const firebase = require('firebase/compat/app');
require('firebase/compat/database');

const DATABASE_URL = 'https://duelyst-backfire-test-default-rtdb.firebaseio.com/';

if (!firebase.apps.length) firebase.initializeApp({ databaseURL: DATABASE_URL });
const database = firebase.database();
// no network in a unit test: writes queue locally instead of dialling out
database.goOffline();

global.window = global;
global._ = require('underscore');
global.Backbone = require('backbone');
// backfire only ever calls `new Firebase(url)`; mirror app/firebase.ts's shim
global.Firebase = function (url) {
  const reference = database.refFromURL(url || DATABASE_URL);
  if (typeof reference.ref !== 'function') {
    Object.defineProperty(reference, 'ref', {
      value: function () {
        return reference;
      },
      configurable: true,
      writable: true,
    });
  }
  return reference;
};
global.Firebase.ServerValue = firebase.database.ServerValue;

require('@duelyst/client/vendor/backfire/backfire.min.js');
const DuelystFirebase = require('@duelyst/client/ui/extensions/duelyst_firebase');

describe('backfire with a derived firebase ref', () => {
  const baseUrl = DATABASE_URL + 'matchmaking/test/invites/to/player-1/';

  it('expect a derived ref to lack a callable .ref (the shape that broke)', () => {
    const derived = new global.Firebase(baseUrl).push();
    expect(typeof derived.ref).to.equal('object');
  });

  it('expect destroy() on a model built from .push() not to throw', () => {
    const inviteRef = new global.Firebase(baseUrl).push();
    const model = new DuelystFirebase.Model({ status: 'sent' }, { firebase: inviteRef });

    // this is the exact call GamesManager.cancelInvite makes
    expect(() => model.destroy({})).to.not.throw();
  });

  it('expect destroy() on a model built from .child() not to throw', () => {
    const childRef = new global.Firebase(DATABASE_URL).child('system-status');
    const model = new DuelystFirebase.Model({ status: 'sent' }, { firebase: childRef });

    expect(() => model.destroy({})).to.not.throw();
  });

  it('expect a patched query ref to resolve to a Reference that has child()', () => {
    const query = new global.Firebase(DATABASE_URL)
      .child('notifications')
      .orderByChild('created_at')
      .startAt(0);
    DuelystFirebase.ensureCallableRef(query);

    expect(typeof query.ref).to.equal('function');
    // a query has no child(); its underlying Reference does, and backfire
    // calls .ref().child(...)
    expect(typeof query.child).to.equal('undefined');
    expect(typeof query.ref().child).to.equal('function');
  });
});
