/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const CONFIG = require('app/common/config');
const CardType = require('@duelyst/sdk/cards/cardType');
const ModifierTakeDamageWatch = require('./modifierTakeDamageWatch');

class ModifierTakeDamageWatchDamageAttacker extends ModifierTakeDamageWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierTakeDamageWatchDamageAttacker';
  static modifierName = 'Take Damage Watch';
  static description = 'Whenever this takes damage, deal %X damage to the attacker';

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

  onDamageTaken(action) {
    let targetToDamage = __guard__(action.getSource(), (x) =>
      x.getAncestorCardOfType(CardType.Unit),
    );
    if (!targetToDamage) {
      // If we couldn't find a unit that dealt the damage, assume the source of damage was spell, in which case damage the general
      targetToDamage = this.getCard()
        .getGameSession()
        .getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId());
    }

    if (targetToDamage != null) {
      const damageAction = new DamageAction(this.getGameSession());
      damageAction.setOwnerId(this.getCard().getOwnerId());
      damageAction.setSource(this.getCard());
      damageAction.setTarget(targetToDamage);
      damageAction.setDamageAmount(this.damageAmount);
      return this.getGameSession().executeAction(damageAction);
    }
  }
}
ModifierTakeDamageWatchDamageAttacker.prototype.type = 'ModifierTakeDamageWatchDamageAttacker';
ModifierTakeDamageWatchDamageAttacker.prototype.fxResource = [
  'FX.Modifiers.ModifierTakeDamageWatch',
  'FX.Modifiers.ModifierGenericDamage',
];

module.exports = ModifierTakeDamageWatchDamageAttacker;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
