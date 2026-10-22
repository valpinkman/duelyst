/*
 * Characterisation of the client's Backbone <-> Firebase binding,
 * apps/client/ui/extensions/firebase_sync.ts, which replaced backfire 0.4.0.
 * Each case is one item of the docs/BACKBONE_AUDIT.md §7.5 checklist: a
 * [keep] pins what backfire did, a [fix] pins what it now does instead.
 *
 * No network: the SDK applies writes to its local cache and raises events from
 * it, which is also how a synced model updates before the server answers in
 * the real client. Remote changes are played by writing to the same location
 * through a second ref; writes the binding makes are recorded where it makes
 * them, at the SDK functions it calls (FirebaseSync.sdk). A modular ref has no
 * methods to wrap, and the test's own writes do not pass through there.
 */

const { expect } = require('chai');

const DATABASE_URL = 'https://duelyst-firebase-sync-test-default-rtdb.firebaseio.com/';
process.env.FIREBASE_URL = DATABASE_URL;

global.window = global;
global._ = require('underscore');
global.Backbone = require('backbone');

const {
  child,
  dbRef,
  getFirebaseDatabase,
  onValue,
  remove,
  set,
  update,
} = require('@duelyst/client/firebase');
const { goOffline } = require('firebase/database');
const FirebaseSync = require('@duelyst/client/ui/extensions/firebase_sync');
const DuelystFirebase = require('@duelyst/client/ui/extensions/duelyst_firebase');

goOffline(getFirebaseDatabase());

let pathCounter = 0;
function freshUrl() {
  pathCounter += 1;
  return DATABASE_URL + 'firebase-sync/' + pathCounter;
}

/*
 * Every SDK call the binding makes is applied as usual and then shown to the
 * observers: observe(fn) has fn(method, ref, args, result) called for each,
 * and a fn returning something other than undefined replaces the result.
 */
const observers = [];
function observe(fn) {
  observers.push(fn);
}
['update', 'set', 'remove', 'onValue'].forEach((method) => {
  const original = FirebaseSync.sdk[method];
  FirebaseSync.sdk[method] = function (ref) {
    const args = Array.prototype.slice.call(arguments, 1);
    let result = original.apply(this, arguments);
    observers.forEach((fn) => {
      const replaced = fn(method, ref, args, result);
      if (replaced !== undefined) result = replaced;
    });
    return result;
  };
});

function sameLocation(a, b) {
  return a != null && b != null && a.toString() === b.toString();
}

function snapshotOf(value) {
  return value == null ? null : JSON.parse(JSON.stringify(value));
}

// a ref whose writes are recorded (and still applied)
function recordingRef(url) {
  const ref = dbRef(url || freshUrl());
  const writes = [];
  observe((method, target, args) => {
    if ((method === 'update' || method === 'set') && sameLocation(target, ref)) {
      writes.push({ method, value: snapshotOf(args[0]) });
    }
  });
  return { ref, writes };
}

// another client's view of the same location
function remote(ref) {
  return dbRef(ref.toString());
}

// what is stored at a location, from the SDK's local cache (compat's once('value'))
function stored(ref) {
  return new Promise((resolve) =>
    onValue(ref, (snapshot) => resolve(snapshot.val()), { onlyOnce: true }),
  );
}

describe('firebase_sync Model read', () => {
  it('expect a snapshot to be applied whole, and sync to fire on every value (items 1, 3)', () => {
    const { ref } = recordingRef();
    const model = new DuelystFirebase.Model(null, { firebase: ref });
    let syncs = 0;
    model.on('sync', () => (syncs += 1));

    set(remote(ref), { a: 1, b: { c: 2 } });
    expect(model.toJSON()).to.deep.equal({ a: 1, b: { c: 2 } });
    update(remote(ref), { a: 3 });
    expect(model.get('a')).to.equal(3);
    expect(syncs).to.equal(2);
  });

  it('expect keys the server dropped to be unset, except _-prefixed ones (item 2)', () => {
    const { ref } = recordingRef();
    const model = new DuelystFirebase.Model(null, { firebase: ref });
    set(remote(ref), { a: 1, b: 2 });
    model.set('_active', true);

    set(remote(ref), { a: 1 });
    expect(model.has('b')).to.equal(false);
    expect(model.get('_active')).to.equal(true);
  });

  it('expect a cached first value to make the model ready inside its constructor (item 4)', async () => {
    const { ref } = recordingRef();
    // a listener on the path puts its value in the SDK cache
    onValue(ref, () => {});
    set(ref, { a: 1 });

    const model = new DuelystFirebase.Model(null, { firebase: remote(ref) });
    expect(model.isSynced).to.equal(true);
    expect(model.get('a')).to.equal(1);
    expect(await model.onSyncOrReady()).to.equal(model);
  });

  it('expect a deleted or scalar node to leave the attributes as they were (items 5, 6)', () => {
    const { ref } = recordingRef();
    const model = new DuelystFirebase.Model(null, { firebase: ref });
    set(remote(ref), { a: 1 });
    let syncs = 0;
    model.on('sync', () => (syncs += 1));

    set(remote(ref), null);
    expect(model.toJSON()).to.deep.equal({ a: 1 });
    set(remote(ref), 'hello');
    expect(model.toJSON()).to.deep.equal({ a: 1 });
    expect(syncs).to.equal(2);
  });
});

describe('firebase_sync Model write', () => {
  it('expect set() to write a shallow update of what it changed (item 7)', () => {
    const { ref, writes } = recordingRef();
    const model = new DuelystFirebase.Model(null, { firebase: ref });
    set(remote(ref), { a: 1, nested: { x: 1, y: 2 } });

    model.set({ a: 2, nested: { x: 1 } });
    model.set('b', 'two');
    // one write per set(), whole top-level values: the same as backfire
    expect(writes).to.deep.equal([
      { method: 'update', value: { a: 2, nested: { x: 1 } } },
      { method: 'update', value: { b: 'two' } },
    ]);
  });

  it('expect _-prefixed keys never to be written (item 8)', () => {
    const { ref, writes } = recordingRef();
    const model = new DuelystFirebase.Model(null, { firebase: ref });

    model.set('_local', 'x');
    model.set({ _local: 'y', real: 'z' });
    expect(writes).to.deep.equal([{ method: 'update', value: { real: 'z' } }]);
  });

  it('expect unset and undefined to write null, and a null id not at all (item 9)', () => {
    const { ref, writes } = recordingRef();
    const model = new DuelystFirebase.Model({ id: 'me', a: 1, b: 1 }, { firebase: ref });

    model.unset('b');
    model.set('a', undefined);
    model.unset('id');
    expect(writes).to.deep.equal([
      { method: 'update', value: { b: null } },
      { method: 'update', value: { a: null } },
    ]);
  });

  it('expect applying a remote value not to write anything back (item 10; backfire wrote the unset keys back as null)', () => {
    const { ref, writes } = recordingRef();
    const model = new DuelystFirebase.Model(null, { firebase: ref });
    // a change handler that itself sets, as Profile.onSync does
    model.on('change:a', () => model.set('derived', model.get('a') * 2));

    set(remote(ref), { a: 1, gone: 1 });
    set(remote(ref), { a: 2 });
    expect(model.get('derived')).to.equal(4);
    expect(writes).to.deep.equal([]);
  });

  it('expect one set() on a cached path to write once, not twice (item 11, fixed)', () => {
    const { ref } = recordingRef();
    onValue(ref, () => {});
    set(ref, { a: 1 });

    const { ref: second, writes } = recordingRef(ref.toString());
    const model = new DuelystFirebase.Model(null, { firebase: second });
    expect(model.isSynced).to.equal(true);

    model.set('a', 2);
    expect(writes).to.deep.equal([{ method: 'update', value: { a: 2 } }]);
  });

  it('expect defaults to be applied locally and never written (item 12, §7.9)', async () => {
    const Settings = DuelystFirebase.Model.extend({
      defaults: { id: 0, username: 'Duelyst', volume: 0.5, theme: 'dark' },
    });
    const { ref, writes } = recordingRef();
    const model = new Settings(null, { firebase: ref });

    // the server stores the account half and one setting
    set(remote(ref), { id: 42, username: 'someone', volume: 0.8 });
    expect(model.toJSON()).to.deep.equal({
      id: 42,
      username: 'someone',
      volume: 0.8,
      theme: 'dark',
    });
    // and a later snapshot still lacks the default: it is refilled, not unset
    update(remote(ref), { volume: 0.9 });
    expect(model.get('theme')).to.equal('dark');
    expect(writes).to.deep.equal([]);
    expect(await stored(remote(ref))).to.deep.equal({ id: 42, username: 'someone', volume: 0.9 });

    // a setting the user changes is written as before
    model.set('theme', 'light');
    expect(writes).to.deep.equal([{ method: 'update', value: { theme: 'light' } }]);
  });

  it('expect save() to write nothing (item 13)', () => {
    const { ref, writes } = recordingRef();
    const model = new DuelystFirebase.Model({ a: 1 }, { firebase: ref });
    model.save();
    model.save({ b: 2 });
    expect(writes).to.deep.equal([]);
  });

  it('expect destroy() to delete the node and fire destroy, with or without options (item 14)', async () => {
    const { ref, writes } = recordingRef();
    set(ref, { status: 'sent' });
    writes.length = 0;
    const model = new DuelystFirebase.Model(null, { firebase: ref });
    let destroyed = 0;
    model.on('destroy', () => (destroyed += 1));
    let succeeded = false;

    model.destroy({ success: () => (succeeded = true) });
    expect(() => model.destroy()).to.not.throw();
    expect(writes).to.deep.equal([
      { method: 'set', value: null },
      { method: 'set', value: null },
    ]);
    expect(destroyed).to.equal(2);
    expect(succeeded).to.equal(true);
    expect(await stored(remote(ref))).to.equal(null);
  });

  it('expect destroy() to stop listening before it deletes the node', () => {
    // a game invite's read rule depends on its own data, so deleting it
    // revokes a listener still attached and the cancel is reported as an error
    const { ref } = recordingRef();
    const calls = [];
    observe((method, target, args, result) => {
      if (!sameLocation(target, ref)) return undefined;
      if (method === 'set') calls.push(['set', args[0]]);
      if (method !== 'onValue') return undefined;
      // the modular SDK's off() for a listener is the function onValue returned
      return function () {
        calls.push(['off', 'value']);
        return result.apply(this, arguments);
      };
    });
    const model = new DuelystFirebase.Model(null, { firebase: ref });

    model.destroy({});
    expect(calls).to.deep.equal([
      ['off', 'value'],
      ['set', null],
    ]);
    set(remote(ref), { status: 'sent' });
    expect(model.has('status')).to.equal(false);
  });

  it('expect a refused write to be reported (item 28)', async () => {
    const refused = new Error('permission_denied');
    const ref = dbRef(DATABASE_URL + 'users/me');
    // the server refuses every update at this location
    observe((method, target) =>
      method === 'update' && sameLocation(target, ref) ? Promise.reject(refused) : undefined,
    );
    const model = new DuelystFirebase.Model(null, { firebase: ref });

    const original = console.error;
    const logged = [];
    console.error = function () {
      logged.push(Array.prototype.slice.call(arguments));
    };
    try {
      model.set('a', 1);
      await new Promise((resolve) => setTimeout(resolve, 0));
    } finally {
      console.error = original;
    }
    expect(logged).to.deep.equal([
      ['Firebase write failed: update ' + DATABASE_URL + 'users/me:', refused],
    ]);
  });
});

describe('firebase_sync Collection read', () => {
  it('expect children before sync, and sync exactly once (item 15)', async () => {
    const seed = dbRef(freshUrl());
    set(seed, { b: { v: 2 }, a: { v: 1 } });

    let syncs = 0;
    const lengthsAtSync = [];
    // initialize runs before the subscriptions, so it sees every sync
    const Counted = DuelystFirebase.Collection.extend({
      initialize() {
        this.on('sync', () => {
          syncs += 1;
          lengthsAtSync.push(this.length);
        });
      },
    });
    const collection = new Counted(null, { firebase: remote(seed) });
    await collection.onSyncOrReady();
    set(child(seed, 'c'), { v: 3 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(syncs).to.equal(1);
    expect(lengthsAtSync).to.deep.equal([2]);
    expect(collection.length).to.equal(3);
  });

  it('expect a member id to be its stored id, else its key, and sorted on it (items 16, 20)', async () => {
    const ref = dbRef(freshUrl());
    set(ref, { k2: { v: 2 }, k1: { v: 1, id: 'stored-id' }, k0: { v: 0 } });
    const collection = new DuelystFirebase.Collection(null, { firebase: ref });
    await collection.onSyncOrReady();

    expect(collection.pluck('id')).to.deep.equal(['k0', 'k2', 'stored-id']);
    expect(collection.get('stored-id')._firebaseKey).to.equal('k1');
  });

  it('expect remote changes and removes to be applied, keeping _ keys (items 15, 29)', async () => {
    const ref = dbRef(freshUrl());
    set(ref, { m: { a: 1, b: 2 } });
    const collection = new DuelystFirebase.Collection(null, { firebase: ref });
    await collection.onSyncOrReady();
    const member = collection.get('m');
    member.set('_selected', true);

    set(child(remote(ref), 'm'), { a: 5 });
    expect(member.toJSON()).to.deep.equal({ id: 'm', a: 5, _selected: true });
    remove(child(remote(ref), 'm'));
    expect(collection.length).to.equal(0);
  });

  it('expect a scalar child to arrive as {id}, as it did under backfire (item 18)', async () => {
    const ref = dbRef(freshUrl());
    set(ref, { count: 5 });
    const collection = new DuelystFirebase.Collection(null, { firebase: ref });
    await collection.onSyncOrReady();
    expect(collection.toJSON()).to.deep.equal([{ id: 'count' }]);
  });

  it('expect child_changed for an absent member not to throw (item 19, fixed)', async () => {
    const ref = dbRef(freshUrl());
    set(ref, { m: { a: 1 } });
    const collection = new DuelystFirebase.Collection(null, { firebase: ref });
    await collection.onSyncOrReady();
    // removed locally only, which is how backfire's throw was reachable
    collection.remove('m');

    const original = console.warn;
    const warned = [];
    console.warn = (message) => warned.push(message);
    try {
      expect(() => update(child(remote(ref), 'm'), { a: 2 })).to.not.throw();
    } finally {
      console.warn = original;
    }
    expect(warned).to.have.length(1);
    expect(collection.length).to.equal(0);
  });

  it('expect a local add/remove/reset to write nothing', async () => {
    const ref = dbRef(freshUrl());
    set(ref, { m: { a: 1 } });
    const collection = new DuelystFirebase.Collection(null, { firebase: ref });
    await collection.onSyncOrReady();

    collection.add({ id: 'local' });
    collection.remove('local');
    collection.remove('m');
    expect(await stored(remote(ref))).to.deep.equal({ m: { a: 1 } });
  });
});

describe('firebase_sync Collection member writes', () => {
  // a collection whose member writes are recorded, keyed by child
  async function syncedCollection(seed) {
    const ref = dbRef(freshUrl());
    set(ref, seed);
    const writes = [];
    observe((method, target, args) => {
      if (method === 'update' && sameLocation(target.parent, ref)) {
        writes.push({ key: target.key, value: snapshotOf(args[0]) });
      }
    });
    const collection = new DuelystFirebase.Collection(null, { firebase: ref });
    await collection.onSyncOrReady();
    return { ref, collection, writes };
  }

  it('expect a member set() to write what differs from the server, at its key (items 17, #50)', async () => {
    const { ref, collection, writes } = await syncedCollection({
      'key-x': { id: 'other-id', status: 'sent', fromName: 'someone' },
    });
    const member = collection.get('other-id');

    member.set('status', 'rejected');
    member.unset('fromName');
    expect(writes).to.deep.equal([
      { key: 'key-x', value: { status: 'rejected' } },
      { key: 'key-x', value: { fromName: null } },
    ]);
    // the real node changed, and no phantom 'other-id' sibling appeared
    expect(await stored(remote(ref))).to.deep.equal({
      'key-x': { id: 'other-id', status: 'rejected' },
    });

    DuelystFirebase.removeChild(collection, member);
    expect(await stored(remote(ref))).to.equal(null);
    expect(collection.length).to.equal(0);
  });

  it('expect a type-only change to be written (item 23, fixed)', async () => {
    const { collection, writes } = await syncedCollection({ c: { count: 1 } });
    collection.get('c').set('count', '1');
    expect(writes).to.deep.equal([{ key: 'c', value: { count: '1' } }]);
  });

  it('expect _-prefixed member keys not to be written (item 29)', async () => {
    const { collection, writes } = await syncedCollection({ c: { is_unread: true } });
    collection.get('c').set({ _selected: true, is_unread: false });
    expect(writes).to.deep.equal([{ key: 'c', value: { is_unread: false } }]);
  });

  it('expect remote changes not to be written back', async () => {
    const { ref, collection, writes } = await syncedCollection({ c: { a: 1, b: 2 } });
    collection.get('c').on('change:a', (member) => member.set('_seen', true));
    set(child(remote(ref), 'c'), { a: 2 });
    expect(collection.get('c').get('a')).to.equal(2);
    expect(writes).to.deep.equal([]);
  });

  it('expect a member removed from the collection to stop writing (as backfire)', async () => {
    const { ref, collection, writes } = await syncedCollection({ invite: { status: 'sent' } });
    const member = collection.get('invite');
    remove(child(remote(ref), 'invite'));

    member.set('status', 'rejected');
    expect(writes).to.deep.equal([]);
    // a write would have recreated the node with just the status
    expect(await stored(remote(ref))).to.equal(null);
  });
});
