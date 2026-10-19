/*
 * The three call sites that wrote through backfire's Collection write path
 * (create/add/remove) now write straight to the SDK through
 * DuelystFirebase.pushChild/addChild/removeChild. See docs/BACKBONE_AUDIT.md
 * §7.2 class C and §7.7 step 2, and apps/client/ui/extensions/duelyst_firebase.ts.
 *
 * Each test issues the old call against one collection and the new one
 * against another, and compares what landed in the database. No network:
 * the SDK applies writes to its local cache and raises child events from it,
 * which is also what makes a synced collection update before the server
 * answers in the real client.
 */

const { expect } = require('chai');

const firebase = require('firebase/compat/app');
require('firebase/compat/database');

const DATABASE_URL = 'https://duelyst-collection-writes-test-default-rtdb.firebaseio.com/';

if (!firebase.apps.length) firebase.initializeApp({ databaseURL: DATABASE_URL });
const database = firebase.database();
database.goOffline();

global.window = global;
global._ = require('underscore');
global.Backbone = require('backbone');
// backfire only ever calls `new Firebase(url)`; mirror apps/client/firebase.ts's shim
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
const Message = require('@duelyst/client/ui/models/message');

let pathCounter = 0;
function freshRef() {
  pathCounter += 1;
  return new global.Firebase(DATABASE_URL + 'collection-writes/' + pathCounter);
}

// value and priority of a node, from the SDK's local cache
async function stored(ref) {
  return (await ref.once('value')).exportVal();
}

function messageAttributes() {
  return {
    fromId: 'me',
    toId: 'buddy',
    gameId: 'game-1',
    generalId: 7,
    body: 'check out my replay',
    timestamp: 1700000000000,
    '.priority': 1700000000000,
  };
}

describe('DuelystFirebase collection writes', () => {
  it('expect pushChild to store what backfire create() stored', async () => {
    const MessagesCollection = DuelystFirebase.Collection.extend({ model: Message });

    const oldRef = freshRef();
    const oldMessages = new MessagesCollection(null, { firebase: oldRef.startAt(0) });
    const created = oldMessages.create(messageAttributes());

    const newRef = freshRef();
    const newMessages = new MessagesCollection(null, { firebase: newRef.startAt(0) });
    const key = DuelystFirebase.pushChild(newMessages, new Message(messageAttributes()).toJSON());

    const before = await stored(oldRef.child(created.id));
    const after = await stored(newRef.child(key));
    // the precondition: backfire stores the minted key as `id`, and the priority
    expect(before.id).to.equal(created.id);
    expect(before['.priority']).to.equal(1700000000000);
    expect(after).to.deep.equal(Object.assign({}, before, { id: key }));
  });

  it('expect the Message defaults to still fill a missing attribute', async () => {
    const MessagesCollection = DuelystFirebase.Collection.extend({ model: Message });
    const attributes = messageAttributes();
    delete attributes.body;

    const oldRef = freshRef();
    const created = new MessagesCollection(null, { firebase: oldRef }).create(
      Object.assign({}, attributes),
    );
    const newRef = freshRef();
    const key = DuelystFirebase.pushChild(
      new MessagesCollection(null, { firebase: newRef }),
      new Message(Object.assign({}, attributes)).toJSON(),
    );

    expect((await stored(oldRef.child(created.id))).body).to.equal('<body>');
    expect((await stored(newRef.child(key))).body).to.equal('<body>');
  });

  it('expect addChild to store what backfire add() stored', async () => {
    const oldRef = freshRef();
    new DuelystFirebase.Collection(null, { firebase: oldRef.limitToLast(20) }).add({
      id: 'news-1',
      read_at: 1700000000000,
      '.priority': 1600000000000,
    });

    const newRef = freshRef();
    const returned = DuelystFirebase.addChild(
      new DuelystFirebase.Collection(null, { firebase: newRef.limitToLast(20) }),
      'news-1',
      { read_at: 1700000000000, '.priority': 1600000000000 },
    );

    expect(returned).to.equal('news-1');
    const before = await stored(oldRef.child('news-1'));
    expect(before).to.deep.equal({
      id: 'news-1',
      read_at: 1700000000000,
      '.priority': 1600000000000,
    });
    expect(await stored(newRef.child('news-1'))).to.deep.equal(before);
  });

  it('expect removeChild to delete what backfire remove() deleted', async () => {
    const seed = { id: 'invite-1', fromName: 'someone', status: 'pending' };

    const oldRef = freshRef();
    oldRef.child('invite-1').set(seed);
    oldRef.child('invite-2').set({ id: 'invite-2' });
    const oldInvites = new DuelystFirebase.Collection(null, { firebase: oldRef });
    oldInvites.remove(oldInvites.get('invite-1'));

    const newRef = freshRef();
    newRef.child('invite-1').set(seed);
    newRef.child('invite-2').set({ id: 'invite-2' });
    const newInvites = new DuelystFirebase.Collection(null, { firebase: newRef });
    DuelystFirebase.removeChild(newInvites, newInvites.get('invite-1').id);

    // offline, only locations this client wrote are complete enough to read
    expect(await stored(oldRef.child('invite-1'))).to.equal(null);
    expect(await stored(newRef.child('invite-1'))).to.equal(null);
    expect(await stored(newRef.child('invite-2'))).to.deep.equal({ id: 'invite-2' });
    // and the collections agree on what is left
    expect(newInvites.pluck('id')).to.deep.equal(['invite-2']);
    expect(oldInvites.pluck('id')).to.deep.equal(newInvites.pluck('id'));
  });

  it('expect the collection to update through its own listeners', async () => {
    const ref = freshRef();
    const collection = new DuelystFirebase.Collection(null, { firebase: ref });
    const events = [];
    collection.on('add', (model) => events.push('add:' + model.id));
    collection.on('remove', (model) => events.push('remove:' + model.id));

    const key = DuelystFirebase.pushChild(collection, { body: 'hi' });
    // raised from the SDK's local cache, before any server could answer
    expect(collection.length).to.equal(1);
    expect(collection.get(key).get('body')).to.equal('hi');

    DuelystFirebase.addChild(collection, 'fixed', { body: 'there' });
    expect(collection.get('fixed').get('id')).to.equal('fixed');

    DuelystFirebase.removeChild(collection, key);
    expect(collection.get(key)).to.equal(undefined);
    expect(events).to.deep.equal(['add:' + key, 'add:fixed', 'remove:' + key]);
  });

  it('expect a refused write to be reported', () => {
    const refused = new Error('permission_denied');
    const writes = [];
    const child = {
      set: (value, onComplete) => writes.push({ value, onComplete }),
      remove: (onComplete) => writes.push({ value: null, onComplete }),
      toString: () => 'https://example/x',
    };
    const fakeRef = { child: () => child, push: () => ({ key: 'pushed' }) };
    const collection = { firebase: { ref: () => fakeRef } };

    DuelystFirebase.pushChild(collection, { body: 'hi' });
    DuelystFirebase.removeChild(collection, 'pushed');
    expect(writes.map((write) => write.value)).to.deep.equal([{ body: 'hi', id: 'pushed' }, null]);

    const original = console.error;
    const logged = [];
    console.error = function () {
      logged.push(Array.prototype.slice.call(arguments));
    };
    try {
      writes.forEach((write) => write.onComplete(null));
      expect(logged).to.have.length(0);
      writes.forEach((write) => write.onComplete(refused));
    } finally {
      console.error = original;
    }
    expect(logged.map((args) => args[0])).to.deep.equal([
      'Firebase write failed: set https://example/x:',
      'Firebase write failed: remove https://example/x:',
    ]);
    expect(logged[0][1]).to.equal(refused);
  });
});
