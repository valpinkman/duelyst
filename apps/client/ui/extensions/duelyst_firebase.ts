var _ = require('underscore');
const PromiseUtils = require('@duelyst/common/utils/utils_promise');

var FirebaseSync = require('./firebase_sync');

/*
 * The client's synced Model and Collection. The binding itself -- reads,
 * writes, the `_`-namespace -- is ./firebase_sync.ts; this layer adds the part
 * every Manager waits on: `isSynced`, `onSyncOrReady()`, and turning a
 * refused read into a `sync_error` and a rejection rather than a hang
 * (docs/BACKBONE_AUDIT.md §7.3, §7.5 items 26-27).
 */
var toRef = FirebaseSync.toRef;

function describeRef(instance) {
  try {
    return String(toRef(instance.firebase));
  } catch (e) {
    return '(unknown ref)';
  }
}

/*
 * The first cancel is the one that matters: a refused Collection read cancels
 * all four of its listeners at once.
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

/*
 * `sync` is hooked BEFORE the binding subscribes: when the first value is
 * already in the SDK's cache it is delivered synchronously inside on(), and a
 * hook registered afterwards would miss it and never become ready.
 */
function trackSync(instance) {
  instance.isSynced = false;
  instance.syncError = null;
  instance.listenToOnce(instance, 'sync', function () {
    instance.isSynced = true;
    instance.trigger('ready');
  });
}

Backbone.DuelystFirebase.Model = FirebaseSync.Model.extend({
  constructor: function (model, options) {
    trackSync(this);
    FirebaseSync.Model.call(this, model, options);
  },

  onSyncOrReady: onSyncOrReady,

  _onFirebaseCancel: onFirebaseCancel,
});

Backbone.DuelystFirebase.Collection = FirebaseSync.Collection.extend({
  constructor: function (models, options) {
    trackSync(this);
    FirebaseSync.Collection.call(this, models, options);
  },

  onSyncOrReady: onSyncOrReady,

  _onFirebaseCancel: onFirebaseCancel,
});

/*
 * The app's child creations and removals in a synced collection's node:
 * creating a chat message, marking news read, and removing a received game
 * invite (docs/BACKBONE_AUDIT.md §7.2 class C, §7.7 step 2). A synced
 * collection's own add/create/remove are local since backfire went; changes
 * to an existing member still write through (firebase_sync.ts).
 *
 * What lands in Firebase is what backfire wrote, at the same child. The
 * collection is not touched: it updates through its own child_* listeners,
 * which the SDK raises locally before the server answers, exactly as it did
 * when backfire issued the write. A `.priority` key in a payload is honoured
 * by the SDK's set().
 *
 * A member is addressed by the key it was read from (`_firebaseKey`), not by
 * its id -- they differ for a child storing its own `id` (§7.5 item 17) --
 * so a member or a key may be passed. A failed write is reported (item 28).
 *
 * `collection.firebase` may be a query (`limitToLast`, `startAt`); writes go
 * to the reference underneath it.
 */
function collectionRef(collection) {
  return toRef(collection.firebase);
}

function childKey(memberOrKey) {
  if (memberOrKey != null && typeof memberOrKey === 'object') {
    return memberOrKey._firebaseKey != null ? memberOrKey._firebaseKey : memberOrKey.id;
  }
  return memberOrKey;
}

function addChild(collection, key, attributes) {
  FirebaseSync.write(
    collectionRef(collection).child(key),
    'set',
    _.extend({}, attributes, { id: key }),
  );
  return key;
}

/* mints a push key for the new child, as backfire's create() did */
function pushChild(collection, attributes) {
  return addChild(collection, collectionRef(collection).push().key, attributes);
}

function removeChild(collection, memberOrKey) {
  FirebaseSync.write(collectionRef(collection).child(childKey(memberOrKey)), 'remove');
}

/*
 * Hung off the exported object rather than assigned to `exports`: the
 * `module.exports = ...` below replaces the exports object wholesale, so an
 * `exports.toRef = ...` earlier in the file never reached a caller.
 */
Backbone.DuelystFirebase.toRef = toRef;
Backbone.DuelystFirebase.childKey = childKey;
Backbone.DuelystFirebase.addChild = addChild;
Backbone.DuelystFirebase.pushChild = pushChild;
Backbone.DuelystFirebase.removeChild = removeChild;

// Expose the class either via CommonJS or the global object
const DuelystFirebase: DuelystFirebaseStatic = Backbone.DuelystFirebase;
module.exports = DuelystFirebase;
