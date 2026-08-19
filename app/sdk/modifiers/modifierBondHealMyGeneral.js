/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const CardType = require('app/sdk/cards/cardType');
const HealAction = require('app/sdk/actions/healAction');
const _ = require('underscore');
const ModifierBond = require('./modifierBond');
const Modifier = require('./modifier');

class ModifierBondHealMyGeneral extends ModifierBond {
  static type = 'ModifierBondHealMyGeneral';
  static description = 'Heal your General';

  static createContextObject(healAmount) {
    const contextObject = super.createContextObject();
    contextObject.healAmount = healAmount;
    return contextObject;
  }

  onBond() {
    const healAction = new HealAction(this.getGameSession());
    healAction.setOwnerId(this.getCard().getOwnerId());
    healAction.setTarget(this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId()));
    healAction.setHealAmount(this.healAmount);

    return this.getGameSession().executeAction(healAction);
  }
}
ModifierBondHealMyGeneral.prototype.type = 'ModifierBondHealMyGeneral';
ModifierBondHealMyGeneral.prototype.fxResource = ['FX.Modifiers.ModifierBond'];
ModifierBondHealMyGeneral.prototype.healAmount = 0;

module.exports = ModifierBondHealMyGeneral;
