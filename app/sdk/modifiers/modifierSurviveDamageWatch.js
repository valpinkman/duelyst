/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const Modifier = require('./modifier');

class ModifierSurviveDamageWatch extends Modifier {
  static type = 'ModifierSurviveDamageWatch';
  static modifierName = 'Survive Damage Watch';
  static description = 'Survive Damage';

  onAfterCleanupAction(e) {
    super.onAfterCleanupAction(e);

    const {
      action,
    } = e;
    // watch for this card taking damage > 0 AND surviving the damage
    if (action instanceof DamageAction && (action.getTarget() === this.getCard()) && (action.getTotalDamageAmount() > 0)) {
      return this.onSurviveDamage(action);
    }
  }

  onSurviveDamage(action) {}
}
ModifierSurviveDamageWatch.prototype.type = 'ModifierSurviveDamageWatch';
ModifierSurviveDamageWatch.prototype.activeInHand = false;
ModifierSurviveDamageWatch.prototype.activeInDeck = false;
ModifierSurviveDamageWatch.prototype.activeInSignatureCards = false;
ModifierSurviveDamageWatch.prototype.activeOnBoard = true;
ModifierSurviveDamageWatch.prototype.fxResource = ['FX.Modifiers.ModifierSurviveDamageWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierSurviveDamageWatch;
