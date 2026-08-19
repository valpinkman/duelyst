/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const HealAction = require('app/sdk/actions/healAction');
const Modifier = require('./modifier');

class ModifierEnemyCannotHeal extends Modifier {
  static type = 'ModifierEnemyCannotHeal';
  static modifierName = 'ModifierEnemyCannotHeal';
  static description = 'Enemy minions and Generals cannot heal';

  // watch for enemy heals, and turn them into 0s
  onModifyActionForExecution(e) {
    super.onModifyActionForExecution(e);

    const {
      action,
    } = e;
    if (action instanceof HealAction && (__guard__(action.getTarget(), (x) => x.getOwnerId()) !== this.getCard().getOwnerId())) {
      action.setChangedByModifier(this);
      return action.setHealMultiplier(0);
    }
  }
}
ModifierEnemyCannotHeal.prototype.type = 'ModifierEnemyCannotHeal';
ModifierEnemyCannotHeal.prototype.activeInHand = false;
ModifierEnemyCannotHeal.prototype.activeInDeck = false;
ModifierEnemyCannotHeal.prototype.activeInSignatureCards = false;
ModifierEnemyCannotHeal.prototype.activeOnBoard = true;
ModifierEnemyCannotHeal.prototype.fxResource = ['FX.Modifiers.ModifierEnemyCannotHeal'];

module.exports = ModifierEnemyCannotHeal;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
