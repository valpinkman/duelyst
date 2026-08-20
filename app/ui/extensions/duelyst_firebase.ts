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
 * not care which SDK is underneath. (backfire's own 12 `.ref()` calls are to
 * ITS OWN Backbone.Firebase#ref method, not the SDK's, so they are unaffected.)
 */
function toRef(target) {
  if (target == null) return target;
  return typeof target.ref === 'function' ? target.ref() : target.ref || target;
}
exports.toRef = toRef;

Backbone.DuelystFirebase = {};

Backbone.DuelystFirebase.Model = Backbone.Firebase.Model.extend({
  constructor: function () {
    this.isSynced = false;
    this.listenToOnce(this, 'sync', function () {
      this.isSynced = true;
      this.trigger('ready');
    });
    Backbone.Firebase.Model.apply(this, arguments);
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
  constructor: function () {
    this.isSynced = false;
    this.listenToOnce(this, 'sync', function () {
      this.isSynced = true;
      this.trigger('ready');
    });
    Backbone.Firebase.Collection.apply(this, arguments);
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

// Expose the class either via CommonJS or the global object
module.exports = Backbone.DuelystFirebase;
