/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const Action = require('./action');
const Logger = require('app/common/logger');

class EndTurnAction extends Action {
  static initClass() {
    this.type = 'EndTurnAction';
  }

  constructor() {
    super(...arguments);
  }

  isRemovableDuringScrubbing() {
    return false;
  }

  _execute() {
    return this.getGameSession().p_endTurn();
  }
}
EndTurnAction.initClass();

module.exports = EndTurnAction;
