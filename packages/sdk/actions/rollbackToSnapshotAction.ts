/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const Action = require('./action');
const GameStatus = require('@duelyst/sdk/gameStatus');
const Logger = require('app/common/logger');

class RollbackToSnapshotAction extends Action {
  declare delay: any;

  static type = 'RollbackToSnapshotAction';

  constructor() {
    super(...arguments);
  }

  _execute() {
    // Logger.module("SDK").debug "[G:#{@.getGameSession().gameId}]", "#{this.type}::execute"
    return this.getGameSession().p_requestRollbackToSnapshot();
  }
}
RollbackToSnapshotAction.prototype.delay = CONFIG.TURN_DELAY;

module.exports = RollbackToSnapshotAction;
