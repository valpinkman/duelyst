var _ProfileManager: Record<string, any> = {};
_ProfileManager.instance = null;
_ProfileManager.getInstance = function (options) {
  if (this.instance == null) {
    this.instance = new ProfileManager(options);
  }
  return this.instance;
};
_ProfileManager.current = _ProfileManager.getInstance;

module.exports = _ProfileManager;

var Logger = require('@duelyst/common/logger');
var Profile: ProfileModelConstructor = require('../models/profile');
var Firebase = require('../../firebase');
var Manager = require('./manager');

var ProfileManager = Manager.extend({
  initialize: function (options) {
    Manager.prototype.initialize.call(this);
  },

  connect: function (options) {
    this.userId = options.userId;
    Manager.prototype.connect.call(this);
  },

  onBeforeConnect: function () {
    Manager.prototype.onBeforeConnect.call(this);

    this.profile = new Profile(null, {
      firebase: process.env.FIREBASE_URL + '/users/' + this.userId,
    });
    this._markAsReadyWhenModelsAndCollectionsSynced([this.profile]);
  },

  onBeforeDisconnect: function () {
    Manager.prototype.onBeforeDisconnect.call(this);
    this.userId = null;
    this.profile.firebase.off();
    this.profile = null;
  },

  /*
   * These two are how the rest of the app reads the profile -- 80 call sites
   * go through `ProfileManager.getInstance().get('...')`. Naming the key and
   * value types here means a typo in a key, or a value of the wrong type, is
   * a compile error inside the manager; call sites pick the checking up as
   * they stop reaching the manager through an untyped `require`.
   */
  get: function <K extends keyof ProfileAttributes & string>(key: K): ProfileAttributes[K] {
    var profile: ProfileModel = this.profile;
    if (!profile) {
      return null;
    }
    return profile.get(key);
  },

  set: function <K extends keyof ProfileAttributes & string>(
    key: K,
    val: ProfileAttributes[K],
    options?: any,
  ) {
    var profile: ProfileModel = this.profile;
    if (!profile) {
      return;
    }
    return profile.set(key, val, options);
  },
});
