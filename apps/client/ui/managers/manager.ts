/**
 * Abstract manager class, do not use directly.
 */

var EventBus = require('@duelyst/common/eventbus');
var EVENTS = require('@duelyst/common/event_types');
var Logger = require('@duelyst/common/logger');
const PromiseUtils = require('@duelyst/common/utils/utils_promise');

var Manager = Backbone.Marionette.Controller.extend({
  connected: null,
  isReady: null,
  readyError: null,

  constructor: function () {
    // Define instance properties off of the prototype chain
    this.connected = null;
    this.isReady = null;
    this.readyError = null;
    this._connection = null;

    // Call the original constructor
    Backbone.Marionette.Controller.apply(this, arguments);
  },

  initialize: function (options) {
    // override in sub class
  },

  getConnected: function () {
    return this.connected;
  },

  connect: function () {
    if (!this.connected) {
      this.connected = true;
      this._connection = {};
      this.listenToOnce(EventBus.getInstance(), EVENTS.session_logged_out, this.disconnect);
      this.trigger('before_connect');
      this.onBeforeConnect();
      this.trigger('connect');
    }
  },

  onBeforeConnect: function () {
    // override in sub class to do any setup just before connect is triggered
  },

  disconnect: function () {
    if (this.connected) {
      this.connected = false;
      this.isReady = false;
      this.readyError = null;
      this.stopListening();
      this.trigger('before_disconnect');
      this.onBeforeDisconnect();
      this.trigger('disconnect');
    }
  },

  onBeforeDisconnect: function () {
    // override in sub class to do any setup just before disconnect is triggered
  },

  getIsReady: function () {
    return this.isReady;
  },

  ready: function () {
    this.isReady = true;
    this.trigger('ready');
  },

  /*
   * The manager will never become ready: one of the models or collections it
   * waits on failed to sync. onReady() rejects with the error, so the login
   * flow shows it instead of sitting on the loading screen.
   */
  readyFailed: function (error) {
    this.readyError = error;
    this.trigger('ready_error', error);
  },

  onConnect: function (callback) {
    var p = new Promise(
      function (resolve, reject) {
        if (this.connected) {
          resolve();
        } else {
          this.listenToOnce(this, 'connect', function () {
            resolve();
          });
        }
      }.bind(this),
    );

    PromiseUtils.nodeify(p, callback);

    return p;
  },

  onReady: function (callback) {
    var p = new Promise(
      function (resolve, reject) {
        if (this.isReady) {
          resolve();
        } else if (this.readyError != null) {
          reject(this.readyError);
        } else {
          var onReady = function () {
            this.stopListening(this, 'ready_error', onError);
            resolve();
          };
          var onError = function (error) {
            this.stopListening(this, 'ready', onReady);
            reject(error);
          };
          this.listenToOnce(this, 'ready', onReady);
          this.listenToOnce(this, 'ready_error', onError);
        }
      }.bind(this),
    );

    PromiseUtils.nodeify(p, callback);

    return p;
  },

  _markAsReadyWhenModelsAndCollectionsSynced: function (modelsAndCollections) {
    var connection = this._connection;
    var allPromises = [];
    for (var i = 0, il = modelsAndCollections.length; i < il; i++) {
      var modelOrCollection = modelsAndCollections[i];
      if (modelOrCollection != null && modelOrCollection.onSyncOrReady != null) {
        allPromises.push(modelOrCollection.onSyncOrReady());
      }
    }
    Promise.all(allPromises).then(
      function () {
        Logger.module('UI').log('Manager::_markAsReadyWhenModelsAndCollectionsSynced -> READY');
        this.ready();
      }.bind(this),
      // second argument, not .catch: an exception thrown by a 'ready' listener is not a sync failure
      function (error) {
        // a sync timeout can outlive a logout; it must not fail the next session's manager
        if (this._connection !== connection) return;
        console.error('Manager::_markAsReadyWhenModelsAndCollectionsSynced -> FAILED', error);
        this.readyFailed(error);
      }.bind(this),
    );
  },
});

module.exports = Manager;
