/*
 * When the server refuses a read, the client used to hang on the loading
 * screen with nothing in the console: backfire passed no cancel callback to any
 * of its subscriptions, onSyncOrReady() never rejected, and the Manager waiting
 * on them had no failure path. See docs/BACKBONE_AUDIT.md §7.3 and §7.5 items
 * 26-27, apps/client/ui/extensions/firebase_sync.ts and duelyst_firebase.ts.
 *
 * No network here, so the SDK never cancels anything itself. Instead each test
 * ref records the arguments of every on()/once() the binding makes, and a test
 * plays the server by calling the cancel callback it was given.
 */

const { expect } = require('chai');

const firebase = require('firebase/compat/app');
require('firebase/compat/database');

const DATABASE_URL = 'https://duelyst-sync-errors-test-default-rtdb.firebaseio.com/';

if (!firebase.apps.length) firebase.initializeApp({ databaseURL: DATABASE_URL });
const database = firebase.database();
// no network in a unit test: nothing syncs, which is what the timeout tests need
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

let pathCounter = 0;

// a ref whose own on()/once() record every subscription and pass it through
function recordingRef() {
  pathCounter += 1;
  const ref = new global.Firebase(DATABASE_URL + 'sync-errors/' + pathCounter);
  const calls = [];
  ['on', 'once'].forEach((method) => {
    const original = ref[method];
    ref[method] = function () {
      calls.push({ method, args: Array.prototype.slice.call(arguments) });
      return original.apply(this, arguments);
    };
  });
  return { ref, calls };
}

function cancelCallbacks(calls) {
  return calls.map((call) => call.args[2]);
}

// silence and capture the console.error the cancel path is supposed to make
function captureConsoleError(fn) {
  const original = console.error;
  const logged = [];
  console.error = function () {
    logged.push(Array.prototype.slice.call(arguments));
  };
  try {
    fn();
  } finally {
    console.error = original;
  }
  return logged;
}

describe('DuelystFirebase cancel callbacks', () => {
  it('expect every Collection subscription to get a cancel callback', () => {
    const { ref, calls } = recordingRef();
    new DuelystFirebase.Collection(null, { firebase: ref });

    // three on(child_*) and one once('value') -- the precondition, so this
    // cannot pass because the binding stopped subscribing
    expect(calls.map((call) => call.method + ':' + call.args[0])).to.deep.equal([
      'on:child_added',
      'on:child_changed',
      'on:child_removed',
      'once:value',
    ]);
    cancelCallbacks(calls).forEach((cancel) => expect(cancel).to.be.a('function'));
  });

  it('expect the Model subscription to get a cancel callback', () => {
    const { ref, calls } = recordingRef();
    new DuelystFirebase.Model(null, { firebase: ref });

    expect(calls.map((call) => call.method + ':' + call.args[0])).to.deep.equal(['on:value']);
    expect(calls[0].args[2]).to.be.a('function');
  });

  it('expect the ref to be left as it was handed over', () => {
    const { ref } = recordingRef();
    const ownOn = ref.on;
    const ownOnce = ref.once;
    new DuelystFirebase.Collection(null, { firebase: ref });
    expect(ref.on).to.equal(ownOn);
    expect(ref.once).to.equal(ownOnce);

    const plain = new global.Firebase(DATABASE_URL + 'sync-errors/plain');
    new DuelystFirebase.Model(null, { firebase: plain });
    expect(Object.prototype.hasOwnProperty.call(plain, 'on')).to.equal(false);
    expect(Object.prototype.hasOwnProperty.call(plain, 'once')).to.equal(false);
  });

  it('expect a string URL to still be resolved to a ref', () => {
    const options = { firebase: DATABASE_URL + 'sync-errors/from-string' };
    const model = new DuelystFirebase.Model(null, options);

    expect(model.firebase).to.be.an('object');
    expect(model.firebase.toString()).to.equal(options.firebase);
    // the caller's options object is not rewritten
    expect(options.firebase).to.be.a('string');
  });
});

describe('DuelystFirebase onSyncOrReady', () => {
  let savedTimeout;
  beforeEach(() => {
    savedTimeout = DuelystFirebase.SYNC_TIMEOUT_MS;
  });
  afterEach(() => {
    DuelystFirebase.SYNC_TIMEOUT_MS = savedTimeout;
  });

  it('expect a cancelled read to reject a pending onSyncOrReady() with the error', async () => {
    const { ref, calls } = recordingRef();
    const collection = new DuelystFirebase.Collection(null, { firebase: ref });
    const pending = collection.onSyncOrReady();

    const denied = new Error('permission_denied at /sync-errors: Client does not have permission');
    const logged = captureConsoleError(() => {
      // the server cancels every listener on the location, not just one
      cancelCallbacks(calls).forEach((cancel) => cancel(denied));
    });

    let caught;
    await pending.catch((error) => {
      caught = error;
    });
    expect(caught).to.equal(denied);
    expect(collection.syncError).to.equal(denied);
    expect(logged).to.have.length(1);
  });

  it('expect onSyncOrReady() after a cancel to reject at once', async () => {
    const { ref, calls } = recordingRef();
    const model = new DuelystFirebase.Model(null, { firebase: ref });
    const denied = new Error('permission_denied');
    captureConsoleError(() => calls[0].args[2](denied));

    let caught;
    await model.onSyncOrReady().catch((error) => {
      caught = error;
    });
    expect(caught).to.equal(denied);
  });

  it('expect the node-style callback to receive the error too', async () => {
    const { ref, calls } = recordingRef();
    const model = new DuelystFirebase.Model(null, { firebase: ref });
    const denied = new Error('permission_denied');

    const received = new Promise((resolve) => {
      model.onSyncOrReady((error) => resolve(error)).catch(() => {});
    });
    captureConsoleError(() => calls[0].args[2](denied));
    expect(await received).to.equal(denied);
  });

  it('expect onSyncOrReady() to reject when the first sync never arrives', async () => {
    DuelystFirebase.SYNC_TIMEOUT_MS = 20;
    const { ref } = recordingRef();
    const collection = new DuelystFirebase.Collection(null, { firebase: ref });

    let caught;
    await collection.onSyncOrReady().catch((error) => {
      caught = error;
    });
    expect(caught).to.be.an('error');
    expect(caught.message).to.match(/^Timed out after 20ms waiting for Firebase to sync /);
    expect(caught.message).to.contain(ref.toString());
    // a timeout does not poison the instance: the data may still arrive
    expect(collection.syncError).to.equal(null);
  });

  it('expect a late sync to still resolve a later onSyncOrReady() after a timeout', async () => {
    DuelystFirebase.SYNC_TIMEOUT_MS = 20;
    const { ref } = recordingRef();
    const model = new DuelystFirebase.Model(null, { firebase: ref });
    await model.onSyncOrReady().catch(() => {});

    DuelystFirebase.SYNC_TIMEOUT_MS = savedTimeout;
    const later = model.onSyncOrReady();
    model.trigger('sync', model, null, null);
    expect(await later).to.equal(model);
  });

  it('expect a sync to resolve as before, and to stop the timeout', async () => {
    DuelystFirebase.SYNC_TIMEOUT_MS = 20;
    const { ref } = recordingRef();
    const model = new DuelystFirebase.Model(null, { firebase: ref });
    const pending = model.onSyncOrReady();
    model.trigger('sync', model, null, null);
    expect(await pending).to.equal(model);

    // no listeners left behind by the settled wait
    expect(model._events.sync_error).to.equal(undefined);
    expect(await model.onSyncOrReady()).to.equal(model);
  });
});

describe('Manager with a model that fails to sync', () => {
  let Manager;
  beforeAll(() => {
    // Manager only needs Marionette.Controller's events; the real one wants jQuery
    function Controller() {
      this.initialize.apply(this, arguments);
    }
    global._.extend(Controller.prototype, global.Backbone.Events);
    Controller.extend = global.Backbone.Model.extend;
    global.Backbone.Marionette = { Controller };
    Manager = require('@duelyst/client/ui/managers/manager');
  });

  function failingModel(error) {
    return { onSyncOrReady: () => Promise.reject(error) };
  }

  function syncedModel() {
    return { onSyncOrReady: () => Promise.resolve() };
  }

  async function settle(promise) {
    try {
      await promise;
      return { resolved: true };
    } catch (error) {
      return { rejected: error };
    }
  }

  function quietly(fn) {
    const original = console.error;
    console.error = () => {};
    return Promise.resolve(fn()).finally(() => {
      console.error = original;
    });
  }

  it('expect onReady() to reject with the sync error instead of hanging', async () => {
    const manager = new Manager();
    manager.connect();
    const denied = new Error('permission_denied');
    const pending = manager.onReady();

    await quietly(async () => {
      manager._markAsReadyWhenModelsAndCollectionsSynced([syncedModel(), failingModel(denied)]);
      expect(await settle(pending)).to.deep.equal({ rejected: denied });
    });
    expect(manager.getIsReady()).to.not.equal(true);
    // a call made after the failure rejects too
    expect(await settle(manager.onReady())).to.deep.equal({ rejected: denied });
  });

  it('expect onReady() to resolve as before when everything syncs', async () => {
    const manager = new Manager();
    manager.connect();
    const pending = manager.onReady();
    manager._markAsReadyWhenModelsAndCollectionsSynced([syncedModel(), syncedModel()]);
    expect(await settle(pending)).to.deep.equal({ resolved: true });
    expect(manager._events.ready_error).to.equal(undefined);
  });

  it('expect a failure from before a logout not to fail the next session', async () => {
    const manager = new Manager();
    manager.connect();
    let rejectStale;
    const stale = { onSyncOrReady: () => new Promise((resolve, reject) => (rejectStale = reject)) };
    manager._markAsReadyWhenModelsAndCollectionsSynced([stale]);

    manager.disconnect();
    manager.connect();
    await quietly(async () => {
      rejectStale(new Error('Timed out'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(manager.readyError).to.equal(null);

    manager._markAsReadyWhenModelsAndCollectionsSynced([syncedModel()]);
    expect(await settle(manager.onReady())).to.deep.equal({ resolved: true });
  });
});
