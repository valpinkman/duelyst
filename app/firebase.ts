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
 * apiKey is required even though the only products used are the RTDB and
 * custom-token sign-in: from firebase v3 on, `signInWithCustomToken` talks to
 * Identity Toolkit, which authenticates the REQUEST with the web API key.
 * Without it every sign-in fails with `auth/invalid-api-key` - and it fails
 * before any network call, so nothing shows up in the network log.
 *
 * The v2 SDK never needed it: legacy tokens were validated by the RTDB itself
 * and Identity Toolkit was not involved at all.
 *
 * It is NOT a secret. The web API key identifies the project, ships in every
 * Firebase web client, and grants nothing on its own - access is controlled by
 * the security rules.
 */
if (!firebase.apps.length) {
  firebase.initializeApp({
    databaseURL,
    apiKey: process.env.FIREBASE_API_KEY,
  });
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
/*
 * firebase 2.x refs had a `ref()` METHOD that returned the ref itself; from v3
 * on `ref` is a getter property. backfire keeps whatever ref it is handed
 * (`case "object": break`) and then calls `this.firebase.ref().child(...)` in
 * six places, so a bare compat ref fails with "this.firebase.ref is not a
 * function".
 *
 * Rather than edit the minified vendored build, every ref this module hands
 * out gets a callable `ref` shadowing the prototype getter on that instance.
 * Both spellings then work: `r.ref()` (backfire) and `toRef(r)` (our code).
 * Only refs created HERE are patched - snapshots and refs returned by
 * `.child()` keep the standard property, which is what the rest of the client
 * reads.
 */
function withCallableRef(reference) {
  if (typeof reference.ref !== 'function') {
    Object.defineProperty(reference, 'ref', {
      value: function () { return reference; },
      configurable: true,
      writable: true,
    });
  }
  return reference;
}

function FirebaseRef(url) {
  return withCallableRef(firebase.database().refFromURL(url || databaseURL));
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
