/*
 * The client's Firebase entry point, on the modular SDK (#9).
 *
 * The game was written against firebase@2.0.3 (2015), whose API was a global
 * `Firebase` constructor with every data method hanging off the ref. The
 * modular SDK has no methods on a ref at all: a ref is a value, and the
 * operations are free functions that take it (`onValue(ref, cb)`,
 * `update(ref, value)`, `child(ref, path)`). Only those functions are
 * bundled, which is what the compat entry points could not offer.
 *
 * This module initialises the app once and hands out refs. The free functions
 * the client uses are re-exported from here, and nothing else in the client
 * loads `firebase/*`: one entry point, so one copy of the SDK in the bundle,
 * and the Firebase surface the client depends on listed in one place.
 */
/*
 * require(), not import, while firebase_compat.ts still exists: compat loads
 * the SDK's CommonJS build, an `import` would bundle its ESM build beside it,
 * and two copies of @firebase/app keep two app registries -- a second,
 * unauthenticated app and Database instead of the one compat signs in. The
 * last #9 PR deletes compat and turns these into imports.
 */
const { initializeApp, getApp, getApps } = require('firebase/app');
const database_ = require('firebase/database');
const { getAuth, signInWithCustomToken, signOut } = require('firebase/auth');

const databaseURL = process.env.FIREBASE_URL;

/*
 * apiKey is required even though the only products used are the RTDB and
 * custom-token sign-in: from firebase v3 on, `signInWithCustomToken` talks to
 * Identity Toolkit, which authenticates the REQUEST with the web API key.
 * Without it every sign-in fails with `auth/invalid-api-key` - and it fails
 * before any network call, so nothing shows up in the network log.
 *
 * It is NOT a secret. The web API key identifies the project, ships in every
 * Firebase web client, and grants nothing on its own - access is controlled by
 * the security rules.
 */
const app = getApps().length
  ? getApp()
  : initializeApp({
      databaseURL,
      apiKey: process.env.FIREBASE_API_KEY,
    });

const database = database_.getDatabase(app);

/**
 * A Reference into the client's database.
 *
 * `dbRef()` is the root, `dbRef('users/' + id)` a path under it. A full URL
 * (`process.env.FIREBASE_URL + 'users/' + id`, or a URL the server sent) is
 * accepted too; it must point into this database, as it had to under v2.
 */
function dbRef(pathOrUrl?: string) {
  if (pathOrUrl == null || pathOrUrl === '') return database_.ref(database);
  if (/^https?:\/\//.test(pathOrUrl)) return database_.refFromURL(database, pathOrUrl);
  return database_.ref(database, pathOrUrl);
}

/** The Database instance, for `goOffline` / `goOnline` and tests. */
function getFirebaseDatabase() {
  return database;
}

/** Signs the RTDB connection in with the custom token the API minted. */
function signInWithToken(token: string) {
  return signInWithCustomToken(getAuth(app), token);
}

function signOutOfFirebase() {
  return signOut(getAuth(app));
}

module.exports = {
  dbRef,
  getFirebaseDatabase,
  signInWithToken,
  signOutOfFirebase,
  child: database_.child,
  endAt: database_.endAt,
  equalTo: database_.equalTo,
  get: database_.get,
  limitToFirst: database_.limitToFirst,
  limitToLast: database_.limitToLast,
  off: database_.off,
  onChildAdded: database_.onChildAdded,
  onChildChanged: database_.onChildChanged,
  onChildRemoved: database_.onChildRemoved,
  onDisconnect: database_.onDisconnect,
  onValue: database_.onValue,
  orderByChild: database_.orderByChild,
  orderByKey: database_.orderByKey,
  push: database_.push,
  query: database_.query,
  remove: database_.remove,
  serverTimestamp: database_.serverTimestamp,
  set: database_.set,
  setWithPriority: database_.setWithPriority,
  startAt: database_.startAt,
  update: database_.update,
};
