/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const HealAction = require('@duelyst/sdk/actions/healAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const CONFIG = require('@duelyst/common/config');
const Modifier = require('./modifier');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitHealMyGeneral extends ModifierOpeningGambit {
  declare type: any;
  declare healAmount: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitHealMyGeneral';
  static modifierName = 'Opening Gambit';
  static description = 'Restore %X Health to your General';

  static createContextObject(healAmount, options) {
    const contextObject = super.createContextObject();
    contextObject.healAmount = healAmount;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/, modifierContextObject.healAmount);
    }
    return this.description;
  }

  onOpeningGambit() {
    const general = this.getCard()
      .getGameSession()
      .getGeneralForPlayerId(this.getCard().getOwnerId());

    const healAction = new HealAction(this.getGameSession());
    healAction.setOwnerId(this.getCard().getOwnerId());
    healAction.setTarget(general);
    healAction.setHealAmount(this.healAmount);
    return this.getGameSession().executeAction(healAction);
  }
}
ModifierOpeningGambitHealMyGeneral.prototype.type = 'ModifierOpeningGambitHealMyGeneral';
ModifierOpeningGambitHealMyGeneral.prototype.healAmount = 0;
ModifierOpeningGambitHealMyGeneral.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
  'FX.Modifiers.ModifierGenericHeal',
];

module.exports = ModifierOpeningGambitHealMyGeneral;
