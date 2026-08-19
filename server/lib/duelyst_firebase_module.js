/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
let error,
  firebaseServiceAccount;
const Promise = require('bluebird');
const firebaseAdmin = require('firebase-admin');
const colors = require('colors');
const moment = require('moment');
const util = require('util');
const _ = require('underscore');
const url = require('url');

const Logger = require('../../app/common/logger');
const config = require('../../config/config.js');

const defaultFirebaseUrl = config.get('firebase.url');
const firebaseLoggingEnabled = config.get('firebase.loggingEnabled');

// Read service account credentials from the environment.
try {
  firebaseServiceAccount = {
    project_id: config.get('firebase.projectId'),
    client_email: config.get('firebase.clientEmail'),
    private_key: config.get('firebase.privateKey'),
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
  static apps = {};

  // Connect to a Firebase URL, returns connection if already exists
  static connect(firebaseUrl) {
    // Check for an existing connection on this URL.
    // TODO: check token expiration, new tokens from callers, etc.
    if (firebaseUrl == null) { firebaseUrl = defaultFirebaseUrl; }
    const key = url.format(url.parse(firebaseUrl));
    if (this.apps[key] != null) {
      return this.apps[key];
    }

    // Create a new connection.
    return this.apps[key] = new DuelystFirebaseModule({
      key,
      firebaseUrl,
    });
  }

  // Gracefully disconnect from Firebase.
  static disconnect(url) {
    if (this.apps[url] != null) {
      Logger.module('Firebase').log(`disconnecting from ${url}`);
      this.apps[url].promise.then((deletable) => deletable.delete().then((error) => Logger.module('Firebase').error(`failed to delete: ${error.toString()}`)));
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
        firebaseAdmin.database.enableLogging(true);
      }

      try {
        const app = firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert(firebaseServiceAccount),
          databaseURL: this.firebaseUrl,
        }, this.firebaseUrl);

        // Initialize the database before resolving.
        const db = app.database();
        const ref = db.ref();
        return resolve(app);
      } catch (e) {
        return reject(new Error('failed to initialize firebase app: ' + e));
      }
    });

    this.promise.catch((error) => delete DuelystFirebaseModule.apps[this.key]);
  }

  // Returns a Promise with the Firebase root reference
  getRootRef() {
    return this.promise
      .then(function (app) {
        try {
          const db = app.database();
          return db.ref();
        } catch (e) {
          return Logger.module('Firebase').error(`failed to get ref: ${e.toString()}`);
        }
      });
  }
}

module.exports = DuelystFirebaseModule;
