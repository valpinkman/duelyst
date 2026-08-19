/*
 * The client's Firebase entry point (plan 9.3).
 *
 * The game was written against firebase@2.0.3 (2015), whose API is a global
 * `Firebase` constructor: `new Firebase(url)` returns a ref, and every data
 * method hangs off it. Nothing past 2.x works that way.
 *
 * This module bridges the two. It initialises firebase@12 through its `compat`
 * entry points, whose ref API is byte-for-byte what the v2 code already calls
 * (`child`, `on`, `once`, `set`, `update`, `push`, `remove`, `orderByChild`,
 * `startAt`, `onDisconnect`), and re-exposes it in the shape the existing code
 * expects. That keeps ~50 `new Firebase(url)` call sites working untouched
 * instead of rewriting them all in one commit.
 *
 * `compat` is a staging post, not the destination: it exists so the SDK can be
 * modern and patched now, with a later step to move call sites onto the tree-
 * shakeable modular API. The parts that genuinely could not be bridged - the
 * auth handshake, and the three renamed methods - are changed at the call site.
 */
const firebase = require('firebase/compat/app');
require('firebase/compat/database');
require('firebase/compat/auth');

const databaseURL = process.env.FIREBASE_URL;

/*
 * The RTDB is the only Firebase product this client uses, so databaseURL is
 * the entire config. apiKey et al. are only needed by products we do not touch
 * (Auth's email/password flows, Storage, Analytics); custom-token sign-in goes
 * through our own server.
 */
if (!firebase.apps.length) {
  firebase.initializeApp({ databaseURL });
}

/**
 * Drop-in for the v2 global `Firebase` constructor.
 *
 * v2: `new Firebase('https://x.firebaseio.com/some/path')` -> ref
 * v9+: `firebase.database().refFromURL(...)` -> the same ref
 *
 * A constructor that returns an object yields that object, so `new Firebase(u)`
 * keeps working at every existing call site. Called without `new` it behaves
 * identically, which some call sites rely on.
 */
function FirebaseRef(url) {
  return firebase.database().refFromURL(url || databaseURL);
}

// v2 exposed these as statics on the constructor; compat moved them onto the
// database namespace. Re-attached so `Firebase.ServerValue.TIMESTAMP` (15 call
// sites) resolves unchanged.
FirebaseRef.ServerValue = firebase.database.ServerValue;

/** The compat auth instance, for signInWithCustomToken / signOut. */
FirebaseRef.auth = () => firebase.auth();

/** Escape hatch for code that needs the namespace itself. */
FirebaseRef.app = firebase;

module.exports = FirebaseRef;
