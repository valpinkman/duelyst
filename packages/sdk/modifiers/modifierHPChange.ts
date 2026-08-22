/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const HealAction = require('@duelyst/sdk/actions/healAction');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const Modifier = require('./modifier');

class ModifierHPChange extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierHPChange';
  static modifierName = 'Modifier HP Change';
  static description = "Whenever this card's HP changes";

  onAction(e) {
    super.onAction(e);

    const { action } = e;

    if (
      action.getTarget() === this.getCard() &&
      ((action instanceof HealAction && action.getTotalHealApplied() > 0) ||
        (action instanceof DamageAction && action.getTotalDamageAmount() > 0))
    ) {
      return this.onHPChange(action);
    }
  }

  onHPChange(e) {}
}
ModifierHPChange.prototype.type = 'ModifierHPChange';
ModifierHPChange.prototype.activeInHand = false;
ModifierHPChange.prototype.activeInDeck = false;
ModifierHPChange.prototype.activeInSignatureCards = false;
ModifierHPChange.prototype.activeOnBoard = true;
ModifierHPChange.prototype.fxResource = ['FX.Modifiers.ModifierBuffSelfOnReplace'];
// override in sub-class
module.exports = ModifierHPChange;
