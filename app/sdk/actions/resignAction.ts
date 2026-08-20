/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const DieAction = require('./dieAction');
const GameStatus = require('app/sdk/gameStatus');

class ResignAction extends DieAction {
  static type = 'ResignAction';

  constructor() {
    super(...arguments);
  }

  isRemovableDuringScrubbing() {
    return false;
  }

  _execute() {
    super._execute();
    return (this.getGameSession().getPlayerById(this.getOwnerId()).hasResigned = true);
  }
}

module.exports = ResignAction;
