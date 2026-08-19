/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const CardType = require('app/sdk/cards/cardType');
const DamageAction = require('app/sdk/actions/damageAction');
const ModifierSpellWatch = require('./modifierSpellWatch');
const Modifier = require('./modifier');

class ModifierSpellWatchDamageGeneral extends ModifierSpellWatch {
  static type = 'ModifierSpellWatchDamageGeneral';
  static modifierName = 'Spell Watch (Damage General)';
  static description = 'Whenever you cast a spell, deal %X damage to the enemy General';

  static createContextObject(damageAmount, options) {
    const contextObject = super.createContextObject(options);
    contextObject.damageAmount = damageAmount;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/, modifierContextObject.damageAmount);
    }
    return this.description;
  }

  onSpellWatch(action) {
    super.onSpellWatch(action);

    const general = this.getCard().getGameSession().getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId());

    const damageAction = new DamageAction(this.getGameSession());
    damageAction.setOwnerId(this.getCard().getOwnerId());
    damageAction.setSource(this.getCard());
    damageAction.setTarget(general);
    damageAction.setDamageAmount(this.damageAmount);
    return this.getGameSession().executeAction(damageAction);
  }
}
ModifierSpellWatchDamageGeneral.prototype.type = 'ModifierSpellWatchDamageGeneral';
ModifierSpellWatchDamageGeneral.prototype.damageAmount = 0;
ModifierSpellWatchDamageGeneral.prototype.fxResource = ['FX.Modifiers.ModifierSpellWatch', 'FX.Modifiers.ModifierGenericDamage'];

module.exports = ModifierSpellWatchDamageGeneral;
