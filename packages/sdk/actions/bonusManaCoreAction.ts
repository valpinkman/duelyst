/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('@duelyst/common/logger');
const Action = require('./action');
const CONFIG = require('@duelyst/common/config');

class BonusManaCoreAction extends Action {
  static type = 'BonusManaCoreAction';

  constructor(gameSession) {
    super(gameSession);
  }

  _execute() {
    super._execute();

    const owner = this.getOwner();
    if (owner != null) {
      // Logger.module("SDK").debug "[G:#{@.getGameSession().gameId}]", "BonusManaCoreAction::execute for #{owner} grant 1 bonus mana core"
      if (owner.getMaximumMana() < CONFIG.MAX_MANA) {
        return owner.maximumMana++;
      }
    }
  }
}

module.exports = BonusManaCoreAction;
