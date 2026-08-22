/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
let error, firebaseServiceAccount;
/*
 * firebase-admin 14 is fully modular: the namespaced API this file used to
 * call (firebaseAdmin.credential.cert, firebaseAdmin.database.enableLogging,
 * app.database(), app.delete()) is gone from the root export, which now only
 * re-exports `firebase-admin/app`. The equivalents live in subpath entry
 * points and are imported directly below. The CLASS API is unchanged, so the
 * 352 DuelystFirebase.connect() call sites are untouched.
 */
const { initializeApp, cert, deleteApp } = require('firebase-admin/app');
const { getDatabase, enableLogging } = require('firebase-admin/database');
const { getAuth } = require('firebase-admin/auth');
const colors = require('colors');
const moment = require('moment');
const util = require('util');
const _ = require('underscore');
const url = require('url');

const Logger = require('@duelyst/common/logger');
const config = require('config/config.js');

const defaultFirebaseUrl = config.get('firebase.url');
const firebaseLoggingEnabled = config.get('firebase.loggingEnabled');

// Read service account credentials from the environment.
try {
  firebaseServiceAccount = {
    project_id: config.get('firebase.projectId'),
    client_email: config.get('firebase.clientEmail'),
    /*
     * PEM keys are single-line-hostile: a service account's private_key is a
     * multi-line PEM, so every transport that carries it as one env var
     * escapes the newlines. Docker Compose un-escapes them when it
     * interpolates from .env, but a plain shell export and a GitHub Actions
     * secret do not - and firebase-admin's cert() rejects the result with
     * "Failed to parse private key". Decoding here (what Firebase's own docs
     * recommend) makes the same value work from every source; it is a no-op
     * when the key already has real newlines.
     *
     * `\\n` as well as `\n`, because Coolify escapes the backslash again when
     * it resolves an environment variable: a value stored as `\n` arrives in
     * the container as `\\n`, and unescaping only the single form leaves a
     * stray backslash on every line -- a corrupt PEM that fails with the same
     * message. A base64 key never contains a backslash, so matching both is
     * unambiguous.
     */
    private_key: (config.get('firebase.privateKey') || '').replace(/\\{1,2}n/g, '\n'),
  };
  if (!firebaseServiceAccount.project_id) {
    throw new Error('FIREBASE_PROJECT_ID must be set!');
  }
  if (!firebaseServiceAccount.client_email) {
    throw new Error('FIREBASE_CLIENT_EMAIL must be set!');
  }
  if (!firebaseServiceAccount.private_key) {
    throw new Error('FIREBASE_PRIVATE_KEY must be set!');
  }
} catch (error1) {
  error = error1;
  Logger.module('Firebase').error(`Failed to read Firebase credentials: ${error}`);
  firebaseServiceAccount = {};
}

class DuelystFirebaseModule {
  declare firebaseUrl: any;
  declare key: any;
  declare promise: any;
  static apps = {};

  // Connect to a Firebase URL, returns connection if already exists
  static connect(firebaseUrl) {
    // Check for an existing connection on this URL.
    // TODO: check token expiration, new tokens from callers, etc.
    if (firebaseUrl == null) {
      firebaseUrl = defaultFirebaseUrl;
    }
    const key = url.format(url.parse(firebaseUrl));
    if (this.apps[key] != null) {
      return this.apps[key];
    }

    // Create a new connection.
    return (this.apps[key] = new DuelystFirebaseModule({
      key,
      firebaseUrl,
    }));
  }

  // Gracefully disconnect from Firebase.
  static disconnect(url) {
    if (this.apps[url] != null) {
      Logger.module('Firebase').log(`disconnecting from ${url}`);
      /*
       * This used to be `.then((error) => log('failed to delete: ' + error))`
       * on the SUCCESS path, so a clean disconnect logged a failure and then
       * threw TypeError on error.toString() (delete() resolves with nothing),
       * producing an unhandled rejection every time. Rewritten as a real
       * .catch while migrating the call to deleteApp().
       */
      this.apps[url].promise
        .then((deletable) => deleteApp(deletable))
        .catch((e) => Logger.module('Firebase').error(`failed to delete: ${e}`));
      return delete DuelystFirebaseModule.apps[url];
    } else {
      return Logger.module('Firebase').log(`already disconnected from ${url}`);
    }
  }

  // Count current number of connections
  static getNumConnections() {
    return _.size(this.apps);
  }

  // Opens new connections
  constructor({ key, firebaseUrl }) {
    this.key = key;
    this.firebaseUrl = firebaseUrl;
    Logger.module('Firebase').log(`connect() -> new app connection with db ${this.key}`);
    this.promise = new Promise((resolve, reject) => {
      // Validate configuration before attempting to connect.
      if (this.firebaseUrl === '') {
        return reject(new Error('firebase.url must be set'));
      }

      if (firebaseLoggingEnabled) {
        enableLogging(true);
      }

      try {
        const app = initializeApp(
          {
            credential: cert(firebaseServiceAccount),
            databaseURL: this.firebaseUrl,
          },
          this.firebaseUrl,
        );

        // Initialize the database before resolving.
        const db = getDatabase(app);
        const ref = db.ref();
        return resolve(app);
      } catch (e) {
        return reject(new Error('failed to initialize firebase app: ' + e));
      }
    });

    this.promise.catch((error) => delete DuelystFirebaseModule.apps[this.key]);
  }

  /*
   * Mint a Firebase custom token (plan 9.1).
   *
   * The client currently authenticates to Firebase with the SAME HS256 JWT it
   * sends to our API, because Firebase 2.x accepted tokens signed with the
   * database secret and exposed their `d` payload to the security rules as
   * `auth`. No SDK past 2.x understands that, so moving the client off
   * firebase@2 requires a real custom token: RS256, signed by the service
   * account, subject in `uid`, everything else under `claims` (which the rules
   * then read as `auth.token.*`).
   *
   * `userId` MUST be the value the rules currently compare against `auth.id`,
   * because it becomes `auth.uid`.
   *
   * Reuses the existing app so the credential is initialised exactly once.
   */
  static createCustomToken(userId, claims, firebaseUrl) {
    return this.connect(firebaseUrl).promise.then((app) =>
      getAuth(app).createCustomToken(userId, claims),
    );
  }

  // Returns a Promise with the Firebase root reference
  getRootRef() {
    return this.promise.then(function (app) {
      try {
        const db = getDatabase(app);
        return db.ref();
      } catch (e) {
        return Logger.module('Firebase').error(`failed to get ref: ${e.toString()}`);
      }
    });
  }
}

module.exports = DuelystFirebaseModule;
