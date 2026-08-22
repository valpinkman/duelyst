var _ = require('underscore');
const PromiseUtils = require('../../common/utils/utils_promise');

/*
 * backfire (app/vendor/backfire) is a Backbone<->Firebase binding written for
 * firebase 2.x and shipped only as a minified build. Rather than edit that
 * blob, the one place it is incompatible with a modern SDK is corrected here.
 *
 * backfire derives a child's id with:
 *     typeof snap.key === 'function' ? snap.key() : snap.name()
 * In firebase 2.x `key` was a METHOD; from v3 on it is a plain string
 * property, so that test falls through to `name()`, which no longer exists -
 * every synced model would come back with `id === undefined`.
 *
 * See app/firebase.ts for why the rest of backfire works untouched.
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
 * app/firebase.ts gives every ref built by `new Firebase(url)` a callable `ref`,
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

Backbone.DuelystFirebase = {};

Backbone.DuelystFirebase.Model = Backbone.Firebase.Model.extend({
  constructor: function (model, options) {
    this.isSynced = false;
    this.listenToOnce(this, 'sync', function () {
      this.isSynced = true;
      this.trigger('ready');
    });
    patchRefs(this, options);
    Backbone.Firebase.Model.apply(this, arguments);
    patchRefs(this, options);
  },

  onSyncOrReady: function (callback) {
    var p = new Promise(
      function (resolve, reject) {
        if (this.isSynced) {
          resolve(this);
        } else {
          this.listenToOnce(this, 'ready', function () {
            resolve(this);
          });
        }
      }.bind(this),
    );
    PromiseUtils.nodeify(p, callback);
    return p;
  },

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
    patchRefs(this, options);
    Backbone.Firebase.Collection.apply(this, arguments);
    patchRefs(this, options);
  },

  onSyncOrReady: function (callback) {
    var p = new Promise(
      function (resolve, reject) {
        if (this.isSynced) {
          resolve(this);
        } else {
          this.listenToOnce(this, 'ready', function () {
            resolve(this);
          });
        }
      }.bind(this),
    );
    PromiseUtils.nodeify(p, callback);
    return p;
  },
});

/*
 * Hung off the exported object rather than assigned to `exports`: the
 * `module.exports = ...` below replaces the exports object wholesale, so an
 * `exports.toRef = ...` earlier in the file never reached a caller.
 */
Backbone.DuelystFirebase.toRef = toRef;
Backbone.DuelystFirebase.ensureCallableRef = ensureCallableRef;

// Expose the class either via CommonJS or the global object
module.exports = Backbone.DuelystFirebase;
