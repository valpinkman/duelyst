/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
class SDKObject {
  declare _private: any;

  constructor(gameSession) {
    // define private default properties
    // these are all properties private to a sub-class that should not get serialized
    // this pattern allows us to add more properties to these classes
    // without increasing the time it takes to serialize the objects
    Object.defineProperty(this, '_private', {
      enumerable: false,
      writable: true,
      value: this.getPrivateDefaults(gameSession),
    });
  }

  getPrivateDefaults(gameSession) {
    return {
      gameSession,
    };
  }

  setGameSession(val) {
    return this._private.gameSession = val;
  }

  getGameSession() {
    return this._private.gameSession;
  }
}
SDKObject.prototype._private = null;

module.exports = SDKObject;
