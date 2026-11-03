var _TelemetryManager: Record<string, any> = {};
_TelemetryManager.instance = null;
_TelemetryManager.getInstance = function () {
  if (this.instance == null) {
    this.instance = new TelemetryManager();
  }
  return this.instance;
};
_TelemetryManager.current = _TelemetryManager.getInstance;

module.exports = _TelemetryManager;

var CONFIG = require('@duelyst/common/config');
var EventBus = require('@duelyst/common/eventbus');
var EVENTS = require('@duelyst/common/event_types');
var Logger = require('@duelyst/common/logger');
var {
  dbRef,
  onDisconnect,
  push,
  remove,
  serverTimestamp,
  setWithPriority,
} = require('../../firebase');
var Manager = require('./manager');
var ProfileManager = require('./profile_manager');

var TelemetryManager = Manager.extend({
  _statusReferences: null,
  _statusReferencesIndexHash: null,

  /* region INITIALIZE */

  initialize: function (options) {
    Manager.prototype.initialize.call(this);

    this._statusReferences = [];
    this._statusReferencesIndexHash = {};

    // this manager does not need to bind to anything
    this.connect();
  },

  /* endregion INITIALIZE */

  /* region CONNECT */

  onBeforeConnect: function () {
    Manager.prototype.onBeforeConnect.call(this);
    // this manager is not tied to login
    this.stopListening(EventBus.getInstance(), EVENTS.session_logged_out, this.disconnect);
    this.ready();
  },

  /* endregion CONNECT */

  setSignal: function (category, type, label, value) {
    var statusRef = push(dbRef('telemetry', category, type));

    var id = 'anon';

    // we can only read the id if the profile manager has loaded
    if (ProfileManager.getInstance().isReady === true) {
      id = ProfileManager.getInstance().get('id');
    }
    setWithPriority(
      statusRef,
      {
        u: id,
        l: label || null,
        v: value || null,
      },
      serverTimestamp(),
    );

    onDisconnect(statusRef).remove();

    this._statusReferences.push(statusRef);

    var index = this._statusReferences.length - 1;

    this._statusReferencesIndexHash[category + ':' + type + ':' + label + ':' + value] = index;

    // return the index of this particular status
    return index;
  },

  clearSignal: function (category, type, label, value) {
    var i = this._statusReferencesIndexHash[category + ':' + type + ':' + label + ':' + value];
    this.clearSignalByIndex(i);
  },

  clearSignalByIndex: function (i) {
    if (this._statusReferences[i]) {
      remove(this._statusReferences[i]);
      onDisconnect(this._statusReferences[i]).cancel();
    }
  },
});
