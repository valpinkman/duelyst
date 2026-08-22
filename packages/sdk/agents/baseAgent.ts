/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('@duelyst/common/config');
const UtilsJavascript = require('@duelyst/common/utils/utils_javascript');
const Logger = require('@duelyst/common/logger');

const _ = require('underscore');

/*
BaseAgent - Base acting agent for taking actions in sdk game
- Abstract class
*/

class BaseAgent {
  declare name: any;
  declare unitIndicesByTag: any;
  declare playerId: any;

  /**
   * BaseAgent constructor.
   * @public
   */
  constructor(playerId) {
    this.playerId = playerId;

    this.unitIndicesByTag = {};
  }

  /**
   * Stores the passed in unit with the given tag
   *
   * @param {Object} unit - a SDK unit
   * @param {string} tag - a string reference for later accessing this unit
   *
   */
  addUnitWithTag(unit, tag) {
    return (this.unitIndicesByTag[tag] = unit.index);
  }

  /**
   * Returns the unit corresponding to the passed in tag
   *
   * @param {string} tag - a string reference to the unit
   *
   */
  getUnitForTag(gameSession, tag) {
    return gameSession.getCardByIndex(this.unitIndicesByTag[tag]);
  }

  /**
   * _reactToGameStep
   * Override in subclasses to react to game steps
   * @param  {Object} lastStep - Last step shown by GameLayer
   */
  gatherAgentActionSequenceAfterStep(lastStep) {}
}
BaseAgent.prototype.name = 'BaseAgent';
BaseAgent.prototype.unitIndicesByTag = null;
BaseAgent.prototype.playerId = null;
// Does nothing - Override in subclass

module.exports = BaseAgent;
