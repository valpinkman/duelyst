/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const SDKObject = require('./object');
const UtilsJavascript = require('@duelyst/common/utils/utils_javascript');

class GameTurn extends SDKObject {
  declare steps: any;
  declare playerId: any;
  declare createdAt: any;
  declare updatedAt: any;
  declare ended: any;

  constructor(gameSession, playerId) {
    super(gameSession);

    // define public properties here that must be always be serialized
    // do not define properties here that should only serialize if different from the default
    this.playerId = playerId;
    this.steps = [];
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
  }

  setPlayerId(val) {
    return (this.playerId = val);
  }

  getPlayerId() {
    return this.playerId;
  }

  getSteps() {
    return this.steps;
  }

  addStep(step) {
    return this.steps.push(step);
  }

  setEnded(val) {
    return (this.ended = val);
  }

  getEnded() {
    return this.ended;
  }

  deserialize(data) {
    UtilsJavascript.fastExtend(this, data);

    this.steps = [];
    if (data.steps != null) {
      return (() => {
        const result = [];
        for (var stepData of Array.from<any>(data.steps)) {
          var step = this.getGameSession().deserializeStepFromFirebase(stepData);
          result.push(this.steps.push(step));
        }
        return result;
      })();
    }
  }
}
GameTurn.prototype.steps = null;
GameTurn.prototype.playerId = '';
GameTurn.prototype.createdAt = null;
GameTurn.prototype.updatedAt = null;
GameTurn.prototype.ended = false;

module.exports = GameTurn;
