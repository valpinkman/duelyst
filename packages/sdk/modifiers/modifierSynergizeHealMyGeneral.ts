/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const HealAction = require('@duelyst/sdk/actions/healAction');
const ModifierSynergize = require('./modifierSynergize');

class ModifierSynergizeHealMyGeneral extends ModifierSynergize {
  declare type: any;
  declare healAmount: any;
  declare fxResource: any;

  static type = 'ModifierSynergizeHealMyGeneral';
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

  onSynergize(action) {
    super.onSynergize(action);

    const healAction = new HealAction(this.getGameSession());
    healAction.setOwnerId(this.getCard().getOwnerId());
    healAction.setTarget(this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId()));
    healAction.setHealAmount(this.healAmount);

    return this.getGameSession().executeAction(healAction);
  }
}
ModifierSynergizeHealMyGeneral.prototype.type = 'ModifierSynergizeHealMyGeneral';
ModifierSynergizeHealMyGeneral.prototype.healAmount = 0;
ModifierSynergizeHealMyGeneral.prototype.fxResource = ['FX.Modifiers.ModifierSpellWatch'];

module.exports = ModifierSynergizeHealMyGeneral;
