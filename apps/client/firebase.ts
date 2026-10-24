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
import { initializeApp, getApp, getApps } from 'firebase/app';
import { child, getDatabase, ref, refFromURL } from 'firebase/database';
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';

export {
  child,
  endAt,
  equalTo,
  get,
  limitToFirst,
  limitToLast,
  off,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  onDisconnect,
  onValue,
  orderByChild,
  orderByKey,
  push,
  query,
  remove,
  serverTimestamp,
  set,
  setWithPriority,
  startAt,
  update,
} from 'firebase/database';

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

const database = getDatabase(app);

/**
 * A Reference into the client's database.
 *
 * `dbRef()` is the root, `dbRef('users/' + id)` a path under it. A full URL
 * (`process.env.FIREBASE_URL + 'users/' + id`, or a URL the server sent) is
 * accepted too; it must point into this database, as it had to under v2.
 *
 * Further arguments are child segments, each applied with `child()`:
 * `dbRef('user-progression', userId, 'game-counter')` is what
 * `new Firebase(url).child('user-progression').child(userId).child(...)` was,
 * including the throw when a segment is undefined, where concatenating it
 * into the path would quietly address `.../undefined/...` instead.
 */
export function dbRef(pathOrUrl?: string, ...segments: string[]) {
  let reference;
  if (pathOrUrl == null || pathOrUrl === '') reference = ref(database);
  else if (/^https?:\/\//.test(pathOrUrl)) reference = refFromURL(database, pathOrUrl);
  else reference = ref(database, pathOrUrl);
  for (const segment of segments) reference = child(reference, segment);
  return reference;
}

/** The Database instance, for `goOffline` / `goOnline` and tests. */
export function getFirebaseDatabase() {
  return database;
}

/** Signs the RTDB connection in with the custom token the API minted. */
export function signInWithToken(token: string) {
  return signInWithCustomToken(getAuth(app), token);
}

export function signOutOfFirebase() {
  return signOut(getAuth(app));
}
