/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const Action = require('./action');
const CardType = require('app/sdk/cards/cardType');
const _ = require('underscore');

class KillAction extends Action {
  declare damageAmount: any;

  static type = 'KillAction';

  constructor() {
    super(...arguments);
  }

  _execute() {
    super._execute();

    const source = this.getSource();
    const target = this.getTarget();

    if (target) {
      // Logger.module("SDK").debug "[G:#{@.getGameSession().gameId}]", "#{this.type}::execute - kill #{target.getName()}.".red
      const dieAction = target.actionDie(source);
      return this.getGameSession().executeAction(dieAction);
    }
  }
}
KillAction.prototype.damageAmount = null;

module.exports = KillAction;
