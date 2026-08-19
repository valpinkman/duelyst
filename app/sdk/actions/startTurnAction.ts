/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const Action = require('./action');
const Logger = require('app/common/logger');

class StartTurnAction extends Action {
  static type = 'StartTurnAction';

  constructor() {
    super(...arguments);
  }

  isRemovableDuringScrubbing() {
    return false;
  }

  _execute() {
    return this.getGameSession().p_startTurn();
  }
}

module.exports = StartTurnAction;
