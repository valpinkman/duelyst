/*
 * The three call sites that wrote through backfire's Collection write path
 * (create/add/remove) write straight to the SDK through
 * DuelystFirebase.pushChild/addChild/removeChild. See docs/BACKBONE_AUDIT.md
 * §7.2 class C and §7.7 step 2, and apps/client/ui/extensions/duelyst_firebase.ts.
 *
 * Until backfire was deleted (#51) each test compared these against the
 * backfire call they replaced; the expected payloads below are what backfire
 * stored, as those tests recorded it. No network:
 * the SDK applies writes to its local cache and raises child events from it,
 * which is also what makes a synced collection update before the server
 * answers in the real client.
 */

const { expect } = require('chai');

const DATABASE_URL = 'https://duelyst-collection-writes-test-default-rtdb.firebaseio.com/';
process.env.FIREBASE_URL = DATABASE_URL;

global.window = global;
global._ = require('underscore');
global.Backbone = require('backbone');

const {
  child,
  dbRef,
  getFirebaseDatabase,
  limitToLast,
  onValue,
  query,
  set,
  startAt,
} = require('@duelyst/client/firebase');
const { goOffline } = require('firebase/database');
goOffline(getFirebaseDatabase());

const FirebaseSync = require('@duelyst/client/ui/extensions/firebase_sync');
const DuelystFirebase = require('@duelyst/client/ui/extensions/duelyst_firebase');
const Message = require('@duelyst/client/ui/models/message');

let pathCounter = 0;
function freshRef() {
  pathCounter += 1;
  return dbRef(DATABASE_URL + 'collection-writes/' + pathCounter);
}

// value and priority of a node, from the SDK's local cache (compat's once('value'))
function stored(ref) {
  return new Promise((resolve) =>
    onValue(ref, (snapshot) => resolve(snapshot.exportVal()), { onlyOnce: true }),
  );
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
    const ref = freshRef();
    const messages = new MessagesCollection(null, { firebase: query(ref, startAt(0)) });
    const key = DuelystFirebase.pushChild(messages, new Message(messageAttributes()).toJSON());

    // the minted key stored as `id`, and the priority
    expect(await stored(child(ref, key))).to.deep.equal(
      Object.assign({ id: key }, messageAttributes()),
    );
  });

  it('expect the Message defaults to still fill a missing attribute', async () => {
    const MessagesCollection = DuelystFirebase.Collection.extend({ model: Message });
    const attributes = messageAttributes();
    delete attributes.body;

    const ref = freshRef();
    const key = DuelystFirebase.pushChild(
      new MessagesCollection(null, { firebase: ref }),
      new Message(Object.assign({}, attributes)).toJSON(),
    );
    expect((await stored(child(ref, key))).body).to.equal('<body>');
  });

  it('expect addChild to store what backfire add() stored', async () => {
    const ref = freshRef();
    const returned = DuelystFirebase.addChild(
      new DuelystFirebase.Collection(null, { firebase: query(ref, limitToLast(20)) }),
      'news-1',
      { read_at: 1700000000000, '.priority': 1600000000000 },
    );

    expect(returned).to.equal('news-1');
    expect(await stored(child(ref, 'news-1'))).to.deep.equal({
      id: 'news-1',
      read_at: 1700000000000,
      '.priority': 1600000000000,
    });
  });

  it('expect removeChild to delete the member it is given, and only it', async () => {
    const ref = freshRef();
    set(child(ref, 'invite-1'), { id: 'invite-1', fromName: 'someone', status: 'pending' });
    set(child(ref, 'invite-2'), { id: 'invite-2' });
    // offline, two child writes do not make the parent complete enough to
    // sync, but its children are delivered from the cache all the same
    const invites = new DuelystFirebase.Collection(null, { firebase: ref });

    DuelystFirebase.removeChild(invites, invites.get('invite-1'));
    expect(await stored(child(ref, 'invite-1'))).to.equal(null);
    expect(await stored(child(ref, 'invite-2'))).to.deep.equal({ id: 'invite-2' });
    expect(invites.pluck('id')).to.deep.equal(['invite-2']);

    // a key works too
    DuelystFirebase.removeChild(invites, 'invite-2');
    expect(invites.length).to.equal(0);
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

  it('expect a refused write to be reported', async () => {
    const refused = new Error('permission_denied');
    const writes = [];
    const ref = freshRef();
    const target = child(ref, 'x');
    // the server refuses every write to `x`, and push() mints that key
    const sdk = Object.assign({}, FirebaseSync.sdk);
    FirebaseSync.sdk.push = () => ({ key: 'x' });
    FirebaseSync.sdk.set = function (at, value) {
      if (at.toString() !== target.toString()) return sdk.set.apply(this, arguments);
      writes.push(value);
      return Promise.reject(refused);
    };
    FirebaseSync.sdk.remove = function (at) {
      if (at.toString() !== target.toString()) return sdk.remove.apply(this, arguments);
      writes.push(null);
      return Promise.reject(refused);
    };
    // a query: writes go to the Reference under it
    const collection = { firebase: query(ref, limitToLast(1)) };

    const original = console.error;
    const logged = [];
    console.error = function () {
      logged.push(Array.prototype.slice.call(arguments));
    };
    try {
      DuelystFirebase.pushChild(collection, { body: 'hi' });
      DuelystFirebase.removeChild(collection, 'x');
      await new Promise((resolve) => setTimeout(resolve, 0));
    } finally {
      console.error = original;
      Object.assign(FirebaseSync.sdk, sdk);
    }
    expect(writes).to.deep.equal([{ body: 'hi', id: 'x' }, null]);
    expect(logged.map((args) => args[0])).to.deep.equal([
      'Firebase write failed: set ' + target.toString() + ':',
      'Firebase write failed: remove ' + target.toString() + ':',
    ]);
    expect(logged[0][1]).to.equal(refused);
  });
});
