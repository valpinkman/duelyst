/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const Action = require('./action');
const CardType = require('app/sdk/cards/cardType');
const CONFIG = require('app/common/config');
const PlayerModifierManaModifier = require('app/sdk/playerModifiers/playerModifierManaModifier');

class BonusManaAction extends Action {
  static type = 'BonusManaAction';

  constructor(gameSession) {
    super(gameSession);
  }

  getBonusMana() {
    return this.bonusMana;
  }

  _execute() {
    super._execute();

    const target = this.getTarget();
    if ((target != null) && !target.isOwnedByGameSession()) {
      const owner = target.getOwner();
      const ownerGeneral = this.getGameSession().getGeneralForPlayer(owner);
      // Logger.module("SDK").debug "[G:#{@.getGameSession().gameId}]", "BonusManaAction::execute for #{owner.getPlayerId()} with bonus #{@bonusMana} for #{@bonusDuration} turns"
      // max sure bonus mana won't take player over max mana
      let {
        bonusMana,
      } = this;
      if ((owner.getRemainingMana() + bonusMana) > CONFIG.MAX_MANA) {
        bonusMana = CONFIG.MAX_MANA - owner.getRemainingMana();
      }
      const manaModifierContextObject = PlayerModifierManaModifier.createBonusManaContextObject(bonusMana);
      manaModifierContextObject.durationEndTurn = this.bonusDuration;
      return this.getGameSession().applyModifierContextObject(manaModifierContextObject, ownerGeneral);
    }
  }
}
BonusManaAction.prototype.bonusMana = 1;
BonusManaAction.prototype.bonusDuration = 1;

module.exports = BonusManaAction;
