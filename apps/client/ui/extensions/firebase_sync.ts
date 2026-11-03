var _ = require('underscore');
var firebaseClient = require('../../firebase');

/*
 * The Backbone <-> Firebase binding the client syncs through: a Model bound to
 * one node, and a Collection bound to one node's children.
 *
 * It replaces backfire 0.4.0, a minified 2015 blob written for firebase 2.x
 * that used to sit in apps/client/vendor. What it keeps, what it deliberately
 * changes and why are in docs/BACKBONE_AUDIT.md §7.3 and §7.5; the item
 * numbers below are that checklist's. test/unit/firebase/firebase_sync.js pins
 * each of them.
 *
 * Written against the modular SDK (#9): a ref is a value handed to free
 * functions. Every SDK call the binding makes goes through `sdk` below, which
 * is the seam test/unit/firebase/* record reads and writes at.
 *
 * Errors: every subscription passes a cancel callback, delivered to the
 * owner's `_onFirebaseCancel(error)` when it has one (duelyst_firebase.ts
 * does), and every write failure is reported with console.error. backfire
 * did neither (items 26, 28).
 */

/*
 * The SDK functions the binding calls, looked up here at call time rather
 * than bound once, so a test can wrap one and see every call the binding
 * makes. Nothing else replaces them.
 */
var sdk = {
  child: firebaseClient.child,
  onValue: firebaseClient.onValue,
  onChildAdded: firebaseClient.onChildAdded,
  onChildChanged: firebaseClient.onChildChanged,
  onChildRemoved: firebaseClient.onChildRemoved,
  update: firebaseClient.update,
  set: firebaseClient.set,
  remove: firebaseClient.remove,
  push: firebaseClient.push,
};

/*
 * The Reference to write through. A Query (`limitToLast`, `startAt`, ...)
 * has no `parent`, and its `.ref` is the Reference underneath it -- which is
 * where backfire's `.ref().child(...)` wrote too. The modular SDK keeps that
 * split, so this stays (docs/BACKBONE_AUDIT.md §7.5).
 */
function toRef(target) {
  if (target == null) return target;
  if ('parent' in target) return target;
  return target.ref || target;
}

/* as backfire: `firebase` from the options, else from the class; a URL string or a factory */
function resolveFirebase(owner, options) {
  if (options && options.firebase) owner.firebase = options.firebase;
  switch (typeof owner.firebase) {
    case 'object':
      break;
    case 'string':
      owner.firebase = firebaseClient.dbRef(owner.firebase);
      break;
    case 'function':
      owner.firebase = owner.firebase();
      break;
    default:
      throw new Error('Invalid firebase reference created');
  }
  if (owner.firebase == null) throw new Error('Invalid firebase reference created');
}

function cancelCallback(owner) {
  return function (error) {
    if (typeof owner._onFirebaseCancel === 'function') owner._onFirebaseCancel(error);
    else console.error('Firebase read cancelled for ' + String(toRef(owner.firebase)) + ':', error);
  };
}

/*
 * Writes return the SDK's promise. Catching it (rather than passing an
 * onComplete) both reports the failure and keeps it from also surfacing as an
 * unhandled rejection.
 */
function reportWriteError(description) {
  return function (error) {
    console.error('Firebase write failed: ' + description + ':', error);
  };
}

/* `method` is the SDK function's name: 'set', 'update' or 'remove' */
function write(ref, method, value) {
  var result = method === 'remove' ? sdk.remove(ref) : sdk[method](ref, value);
  if (result != null && typeof result.catch === 'function') {
    result.catch(reportWriteError(method + ' ' + String(ref)));
  }
  return result;
}

function isPrivateKey(key) {
  return key.indexOf('_') === 0;
}

/*
 * Model: one node, applied whole on every `value` (items 1-3).
 *
 * `_`-prefixed attributes are local-only: never written, and kept when a
 * snapshot lacks them (items 2, 8). PresenceModel keeps its unread markers on
 * another user's node that way, and Profile its resolution lists.
 *
 * `defaults` are applied locally only (§7.9 decision 3). backfire also wrote
 * them back to the server on the first sync, which put Profile's 24 settings
 * defaults -- `id: 0` and `username: 'Duelyst'` among them -- into
 * /users/<id> for every account that had none stored. Nothing server-side
 * reads those keys (§7.6 #5). They are now refilled on every snapshot instead,
 * so a key the server does not store still reads as its default.
 */
var FirebaseSyncModel = Backbone.Model.extend({
  constructor: function (attributes, options) {
    // set before subscribing: a cached first value is delivered inside on() (item 4)
    this._applyingRemote = false;
    Backbone.Model.apply(this, arguments);
    resolveFirebase(this, options);
    // registered exactly once, so one set() is one write (item 11)
    this.on('change', this._updateModel, this);
    this._unsubscribeValue = sdk.onValue(
      this.firebase,
      this._modelChanged.bind(this),
      cancelCallback(this),
    );
  },

  /* there is no server round trip to save to: writes follow every set() (item 13) */
  save: function () {},

  /* item 14 */
  destroy: function (options) {
    // Unsubscribe first: when the read rule depends on the node's own data
    // (a game invite is readable by its `fromId`), deleting it revokes this
    // listener, and the cancel would be reported as a failed read.
    this._unsubscribeValue();
    write(toRef(this.firebase), 'set', null);
    this.trigger('destroy', this, this.collection, options);
    if (options && options.success) options.success(this, null, options);
  },

  /* items 7-10: a shallow update() of what this set() changed */
  _updateModel: function (model) {
    if (this._applyingRemote) return;
    var delta = model.changedAttributes();
    if (!delta) return;
    _.each(_.keys(delta), function (key) {
      var value = delta[key];
      if (isPrivateKey(key)) {
        delete delta[key];
      } else if (value === undefined || value === null) {
        if (key === 'id') delete delta[key];
        else delta[key] = null;
      }
    });
    if (_.size(delta)) write(toRef(this.firebase), 'update', delta);
  },

  /*
   * A null or scalar snapshot changes no attribute but still fires `sync`,
   * which is what backfire did; whether a deleted node should clear the model
   * is §7.5 items 5-6, left as it was.
   */
  _modelChanged: function (snapshot) {
    var value = snapshot.val();
    this._applyingRemote = true;
    try {
      if (typeof value === 'object' && value !== null) {
        var defaults = _.result(this, 'defaults');
        var next = defaults ? _.defaults({}, value, defaults) : value;
        var self = this;
        _.each(_.difference(_.keys(this.attributes), _.keys(next)), function (key) {
          if (!isPrivateKey(key)) self.unset(key);
        });
        this.set(next);
      }
    } finally {
      this._applyingRemote = false;
    }
    this.trigger('sync', this, null, null);
  },
});

/*
 * Collection: one node's children. All initial `child_added` events precede
 * `value` (an SDK guarantee), so `sync` -- which fires once -- means
 * "populated" (item 15).
 *
 * A member's id is its stored `id` if it has one, else its key (item 16), and
 * `comparator` sorts on it (item 20). The key itself is kept on the member as
 * `_firebaseKey`, and every write addresses it: backfire wrote to
 * `child(model.id)`, which for a child storing a different `id` is a phantom
 * sibling (item 17).
 *
 * Member writes: a change to a member is written to its child, as backfire
 * did -- inventory and quest read-marks, a received invite's status and a
 * game's reconnect flags all depend on it. What is written is every key whose
 * local value differs from the last one read, compared with _.isEqual
 * (backfire's `!=` silently dropped type-only changes, item 23), minus
 * `_`-prefixed keys (item 29). A member removed from the collection stops
 * writing, because Backbone stops forwarding its events.
 *
 * add/remove/create/reset are Backbone's own and local: backfire wrote those
 * to the server, but since #45 no call site uses them, and the app's
 * collection writes go through the explicit helpers in duelyst_firebase.ts.
 */
var FirebaseSyncCollection = Backbone.Collection.extend({
  constructor: function (models, options) {
    Backbone.Collection.apply(this, arguments);
    resolveFirebase(this, options);
    var onCancel = cancelCallback(this);
    var target = this.firebase;
    sdk.onChildAdded(target, this._childAdded.bind(this), onCancel);
    sdk.onChildChanged(target, this._childChanged.bind(this), onCancel);
    sdk.onChildRemoved(target, this._childRemoved.bind(this), onCancel);
    sdk.onValue(
      target,
      function () {
        this.trigger('sync', this, null, null);
      }.bind(this),
      onCancel,
      { onlyOnce: true },
    );
    this.listenTo(this, 'change', this._updateMember);
  },

  /* the server is the only source; there is nothing to fetch */
  sync: function () {},
  fetch: function () {},

  comparator: function (model) {
    return model.id;
  },

  /*
   * A scalar child arrives as `{id}` with its value dropped, as it did under
   * backfire (§7.5 item 18, left as it was). The 2026-10-19 live-data check
   * found no scalar children.
   */
  _memberAttributes: function (snapshot) {
    var value = snapshot.val();
    if (!_.isObject(value)) value = {};
    if (!value.id) value.id = snapshot.key;
    return value;
  },

  _childAdded: function (snapshot) {
    var attributes = this._memberAttributes(snapshot);
    Backbone.Collection.prototype.add.call(this, attributes);
    var member = this.get(attributes.id);
    if (member) {
      member._firebaseKey = snapshot.key;
      member._remoteAttributes = attributes;
    }
  },

  _childChanged: function (snapshot) {
    var attributes = this._memberAttributes(snapshot);
    var member = this.get(attributes.id);
    if (!member) {
      // backfire threw here, from inside the SDK's event queue (item 19)
      console.warn('Firebase child_changed for a member not in the collection: ' + snapshot.key);
      return;
    }
    member._firebaseKey = snapshot.key;
    member._remoteAttributes = attributes;
    member._applyingRemote = true;
    try {
      _.each(_.difference(_.keys(member.attributes), _.keys(attributes)), function (key) {
        if (!isPrivateKey(key)) member.unset(key);
      });
      member.set(attributes);
    } finally {
      member._applyingRemote = false;
    }
  },

  _updateMember: function (member) {
    if (member._applyingRemote || member._firebaseKey == null) return;
    var remoteAttributes = member._remoteAttributes || {};
    var local = member.toJSON();
    var delta = {};
    _.each(_.union(_.keys(remoteAttributes), _.keys(local)), function (key) {
      if (isPrivateKey(key)) return;
      if (!_.has(local, key)) delta[key] = null;
      else if (!_.isEqual(local[key], remoteAttributes[key])) delta[key] = local[key];
    });
    if (_.size(delta)) {
      write(sdk.child(toRef(this.firebase), member._firebaseKey), 'update', delta);
    }
  },

  _childRemoved: function (snapshot) {
    var member = this.get(this._memberAttributes(snapshot).id);
    if (member) Backbone.Collection.prototype.remove.call(this, member);
  },
});

module.exports = {
  Model: FirebaseSyncModel,
  Collection: FirebaseSyncCollection,
  toRef: toRef,
  write: write,
  sdk: sdk,
};
