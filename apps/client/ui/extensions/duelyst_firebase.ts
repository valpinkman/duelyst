var _ = require('underscore');
const PromiseUtils = require('@duelyst/common/utils/utils_promise');

/*
 * backfire (apps/client/vendor/backfire) is a Backbone<->Firebase binding
 * written for firebase 2.x and shipped only as a minified build. Rather than
 * edit that blob, its incompatibilities with a modern SDK are corrected here.
 *
 * backfire derives a collection child's id with:
 *     typeof snap.key === 'function' ? snap.key() : snap.name()
 * In firebase 2.x `key` was a METHOD; from v3 on it is a plain string
 * property, so that test falls through to `name()`, which no longer exists.
 * The TypeError is thrown inside the SDK's event handler, so the caller sees
 * nothing and the collection silently stays empty. Models are unaffected:
 * they never call `_getKey`. See docs/BACKBONE_AUDIT.md §7.0.
 *
 * See apps/client/firebase.ts and ensureCallableRef below for `.ref()`.
 */
if (Backbone.Firebase && Backbone.Firebase.prototype) {
  Backbone.Firebase.prototype._getKey = function (snapshotOrRef) {
    return typeof snapshotOrRef.key === 'function' ? snapshotOrRef.key() : snapshotOrRef.key;
  };
}

/*
 * firebase 2.x exposed `.ref()` as a METHOD on snapshots and refs; from v3 on
 * `.ref` is a plain property. Both shapes are accepted here so this file does
 * not care which SDK is underneath.
 */
function toRef(target) {
  if (target == null) return target;
  return typeof target.ref === 'function' ? target.ref() : target.ref || target;
}

/*
 * ...and backfire calls the SDK's `.ref()` too, in nine methods: create, update,
 * add, remove, destroy, _parseModels, _removeModel and both _updateModel
 * implementations. `this.firebase` is whatever ref it was handed (its
 * `_determineRef` does `case "object": break`), and `this._fbref` comes from the
 * same place, so those are SDK refs, not backfire's own `Backbone.Firebase#ref`.
 *
 * apps/client/firebase.ts gives every ref built by `new Firebase(url)` a callable `ref`,
 * which is why most of this works. It is not enough: a DERIVED ref does not
 * inherit the patch, and half the call sites hand backfire one --
 * `new Firebase(url).push()` (game invites), `.child(...)`, `.limitToLast(1)`,
 * `.orderByChild(...).startAt(...)`. Sending a friend a game invite then failed
 * in `destroy()` with "this.firebase.ref is not a function", leaving the invite
 * live in Firebase so both players sat on "waiting".
 *
 * Every ref entering backfire is patched here instead, which is the one place
 * they all pass through: nothing outside this file constructs a
 * Backbone.Firebase model directly.
 *
 * Returns the ref the getter yields rather than the target itself, because they
 * are not the same object: for a QUERY, `.ref` is the underlying Reference and
 * has `child()`, while the query does not -- and backfire calls
 * `.ref().child(...)`.
 */
function ensureCallableRef(target) {
  if (target == null || typeof target !== 'object') return target;
  if (typeof target.ref === 'function') return target;
  var underlying = target.ref || target; // read the getter BEFORE shadowing it
  Object.defineProperty(target, 'ref', {
    value: function () {
      return underlying;
    },
    configurable: true,
    writable: true,
  });
  return target;
}

/*
 * Patched before backfire runs (so the ref is already callable while it syncs)
 * and again after (so a ref backfire resolved itself -- from a string, or from a
 * `firebase` function on the class -- is covered too).
 */
function patchRefs(instance, options) {
  if (options != null) ensureCallableRef(options.firebase);
  ensureCallableRef(instance.firebase);
}

/*
 * backfire subscribes in its constructor -- `on` four times for a Collection,
 * once for a Model, plus a Collection's `once('value')` -- and never passes a
 * cancel callback. When the server refuses a read (security rules, a path the
 * client may not see, a wrong FIREBASE_URL) the SDK cancels the listener,
 * `sync` never fires, and every `onSyncOrReady()` waiting on it hangs with
 * nothing in the console. See docs/BACKBONE_AUDIT.md §7.3 and §7.5 items 26-27.
 *
 * The blob is not edited. Instead, for the duration of its constructor only,
 * `on`/`once` on the ref it is about to use are shadowed by versions that
 * append our cancel callback whenever backfire passes none. The shadow is
 * removed afterwards, so the ref is left as the caller handed it over and a ref
 * shared between two instances reports each cancel to the right one.
 *
 * That needs the ref to exist before backfire runs, so a string URL is resolved
 * here exactly as backfire would (`new Firebase(url)`); it then takes backfire's
 * `case "object"` branch.
 */
function resolveFirebaseOption(options) {
  if (options != null && typeof options.firebase === 'string') {
    return _.extend({}, options, { firebase: new Firebase(options.firebase) });
  }
  return options;
}

function constructWithCancelCallbacks(instance, ref, construct) {
  if (ref == null || typeof ref !== 'object' || typeof ref.on !== 'function') {
    return construct();
  }
  var onCancel = function (error) {
    instance._onFirebaseCancel(error);
  };
  var shadowed = ['on', 'once'].map(function (method) {
    var ownDescriptor = Object.getOwnPropertyDescriptor(ref, method);
    var original = ref[method];
    Object.defineProperty(ref, method, {
      value: function () {
        // backfire never passes a third argument; anything that does is left alone
        if (arguments.length > 2) return original.apply(this, arguments);
        var result = original.call(this, arguments[0], arguments[1], onCancel);
        // once() also returns a promise that rejects on cancel; onCancel reports it
        if (result != null && typeof result.catch === 'function') result.catch(function () {});
        return result;
      },
      configurable: true,
      writable: true,
    });
    return { method: method, ownDescriptor: ownDescriptor };
  });
  try {
    return construct();
  } finally {
    shadowed.forEach(function (entry) {
      if (entry.ownDescriptor) Object.defineProperty(ref, entry.method, entry.ownDescriptor);
      else delete ref[entry.method];
    });
  }
}

function describeRef(instance) {
  try {
    return String(toRef(instance.firebase));
  } catch (e) {
    return '(unknown ref)';
  }
}

/*
 * The first cancel is the one that matters: a refused Collection read cancels
 * all five of its listeners at once.
 */
function onFirebaseCancel(error) {
  if (this.syncError != null) return;
  this.syncError =
    error != null ? error : new Error('Firebase read cancelled: ' + describeRef(this));
  console.error('Firebase read cancelled for ' + describeRef(this) + ':', this.syncError);
  this.trigger('sync_error', this, this.syncError);
}

/*
 * Resolves on the first sync. Rejects if the read is cancelled, or if the
 * first sync has not arrived within DuelystFirebase.SYNC_TIMEOUT_MS -- the
 * cases that used to leave the client on the loading screen forever. The
 * timeout is per call and does not poison the instance: a later call still
 * resolves if the data does arrive.
 */
function onSyncOrReady(callback) {
  var self = this;
  var p = new Promise(function (resolve, reject) {
    if (self.isSynced) return resolve(self);
    if (self.syncError != null) return reject(self.syncError);
    var timer;
    var settle = function () {
      clearTimeout(timer);
      self.stopListening(self, 'ready', onReady);
      self.stopListening(self, 'sync_error', onError);
    };
    var onReady = function () {
      settle();
      resolve(self);
    };
    var onError = function (target, error) {
      settle();
      reject(error);
    };
    self.listenTo(self, 'ready', onReady);
    self.listenTo(self, 'sync_error', onError);
    var timeoutMs = Backbone.DuelystFirebase.SYNC_TIMEOUT_MS;
    timer = setTimeout(function () {
      settle();
      reject(
        new Error(
          'Timed out after ' + timeoutMs + 'ms waiting for Firebase to sync ' + describeRef(self),
        ),
      );
    }, timeoutMs);
  });
  PromiseUtils.nodeify(p, callback);
  return p;
}

/*
 * As in duelyst_backbone.ts: `Backbone` is a vendor global typed `any`, so the
 * published shape is stated once, here, and consumers annotate their require
 * with `DuelystFirebaseStatic` to get typed attributes. See
 * apps/client/types/backbone_models.d.ts.
 */
Backbone.DuelystFirebase = {
  // generous: this only has to beat "forever", not a slow connection
  SYNC_TIMEOUT_MS: 30000,
};

Backbone.DuelystFirebase.Model = Backbone.Firebase.Model.extend({
  constructor: function (model, options) {
    this.isSynced = false;
    this.listenToOnce(this, 'sync', function () {
      this.isSynced = true;
      this.trigger('ready');
    });
    this.syncError = null;
    options = resolveFirebaseOption(options);
    patchRefs(this, options);
    constructWithCancelCallbacks(
      this,
      options && options.firebase,
      function () {
        Backbone.Firebase.Model.call(this, model, options);
      }.bind(this),
    );
    patchRefs(this, options);
  },

  onSyncOrReady: onSyncOrReady,

  _onFirebaseCancel: onFirebaseCancel,

  _updateModel: function (model) {
    // Find the deleted keys and set their values to null
    // so Firebase properly deletes them.
    var modelObj = model.changedAttributes();
    _.each(model.changed, function (value, key) {
      if (key.indexOf('_') == 0) {
        // ignore all attributes starting with an underscore
        delete modelObj[key];
      } else if (typeof value === 'undefined' || value === null) {
        if (key == 'id') {
          delete modelObj[key];
        } else {
          modelObj[key] = null;
        }
      }
    });
    if (_.size(modelObj)) {
      toRef(this.firebase).update(modelObj, this._log);
    }
  },

  _modelChanged: function (snap) {
    // Unset attributes that have been deleted from the server
    // by comparing the keys that have been removed.
    var newModel = snap.val();
    if (typeof newModel === 'object' && newModel !== null) {
      var diff = _.difference(_.keys(this.attributes), _.keys(newModel));
      var self = this;
      _.each(diff, function (key) {
        if (key.indexOf('_') != 0) self.unset(key);
      });
    }
    this._listenLocalChange(false);
    this.set(newModel);
    this._listenLocalChange(true);
    this.trigger('sync', this, null, null);
  },
});

Backbone.DuelystFirebase.Collection = Backbone.Firebase.Collection.extend({
  constructor: function (models, options) {
    this.isSynced = false;
    this.listenToOnce(this, 'sync', function () {
      this.isSynced = true;
      this.trigger('ready');
    });
    this.syncError = null;
    options = resolveFirebaseOption(options);
    patchRefs(this, options);
    constructWithCancelCallbacks(
      this,
      options && options.firebase,
      function () {
        Backbone.Firebase.Collection.call(this, models, options);
      }.bind(this),
    );
    patchRefs(this, options);
  },

  onSyncOrReady: onSyncOrReady,

  _onFirebaseCancel: onFirebaseCancel,
});

/*
 * Direct writes into a synced collection's node. These replace backfire's
 * Collection add()/create()/remove(), which only three call sites used
 * (docs/BACKBONE_AUDIT.md §7.2 class C, §7.7 step 2), so that the owned
 * replacement for the blob never has to reproduce that write path.
 *
 * What lands in Firebase is what backfire wrote: the same child path, and the
 * payload with the child's key also stored as `id`. The collection itself is
 * not touched: it updates through its own child_added/child_removed
 * listeners, which the SDK raises locally before the server answers, exactly
 * as it did when backfire issued the write. A `.priority` key in the payload
 * is honoured by the SDK's set().
 *
 * backfire dropped a failed write silently (its completion callback defaulted
 * to a no-op), and the SDK quietly rolled the optimistic child back. A failure
 * is now at least reported (§7.5 item 28).
 *
 * `collection.firebase` may be a query (`limitToLast`, `startAt`); writes go
 * to the reference underneath it, as backfire's `.ref().child(...)` did.
 */
function collectionRef(collection) {
  return toRef(collection.firebase);
}

function reportWriteError(description) {
  return function (error) {
    if (error != null) console.error('Firebase write failed: ' + description + ':', error);
  };
}

function addChild(collection, key, attributes) {
  var ref = collectionRef(collection).child(key);
  ref.set(_.extend({}, attributes, { id: key }), reportWriteError('set ' + String(ref)));
  return key;
}

/* mints a push key for the new child, as backfire's create() did */
function pushChild(collection, attributes) {
  return addChild(collection, collectionRef(collection).push().key, attributes);
}

function removeChild(collection, key) {
  var ref = collectionRef(collection).child(key);
  ref.remove(reportWriteError('remove ' + String(ref)));
}

/*
 * Hung off the exported object rather than assigned to `exports`: the
 * `module.exports = ...` below replaces the exports object wholesale, so an
 * `exports.toRef = ...` earlier in the file never reached a caller.
 */
Backbone.DuelystFirebase.toRef = toRef;
Backbone.DuelystFirebase.ensureCallableRef = ensureCallableRef;
Backbone.DuelystFirebase.addChild = addChild;
Backbone.DuelystFirebase.pushChild = pushChild;
Backbone.DuelystFirebase.removeChild = removeChild;

// Expose the class either via CommonJS or the global object
const DuelystFirebase: DuelystFirebaseStatic = Backbone.DuelystFirebase;
module.exports = DuelystFirebase;
