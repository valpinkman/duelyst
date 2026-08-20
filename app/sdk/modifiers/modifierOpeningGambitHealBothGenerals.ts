/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const HealAction = require('app/sdk/actions/healAction');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitHealBothGenerals extends ModifierOpeningGambit {
  declare type: any;
  declare healAmount: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitHealBothGenerals';
  static modifierName = 'Opening Gambit';
  static description = 'Restore %X Health to BOTH Generals';

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
    this.getGameSession().executeAction(healAction);

    const enemyGeneral = this.getCard()
      .getGameSession()
      .getGeneralForPlayerId(
        this.getGameSession().getOpponentPlayerIdOfPlayerId(this.getCard().getOwnerId()),
      );

    const healAction2 = new HealAction(this.getGameSession());
    healAction2.setOwnerId(this.getCard().getOwnerId());
    healAction2.setTarget(enemyGeneral);
    healAction2.setHealAmount(this.healAmount);
    return this.getGameSession().executeAction(healAction2);
  }
}
ModifierOpeningGambitHealBothGenerals.prototype.type = 'ModifierOpeningGambitHealBothGenerals';
ModifierOpeningGambitHealBothGenerals.prototype.healAmount = 0;
ModifierOpeningGambitHealBothGenerals.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
  'FX.Modifiers.ModifierGenericHeal',
];

module.exports = ModifierOpeningGambitHealBothGenerals;
