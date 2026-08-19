/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const SetExhaustionAction = require('app/sdk/actions/setExhaustionAction');
const Modifier = require('./modifier');

class ModifierTransformed extends Modifier {
  static type = 'ModifierTransformed';
  static modifierName = 'Transformed';
  static description = 'Transformed';
  static isHiddenToUI = true;

  static createContextObject(exhausted, movesMade, attacksMade, options) {
    const contextObject = super.createContextObject(options);
    contextObject.exhausted = exhausted;
    contextObject.movesMade = movesMade;
    contextObject.attacksMade = attacksMade;
    return contextObject;
  }

  onApplyToCard(card) {
    super.onApplyToCard(card);

    // update exhaustion state of transformed card
    // only do this when this modifier is initially applied to the card
    if (this._private.cachedIsActive) {
      const setExhaustionAction = this.getGameSession().createActionForType(SetExhaustionAction.type);
      setExhaustionAction.setExhausted(this.exhausted);
      setExhaustionAction.setMovesMade(this.movesMade);
      setExhaustionAction.setAttacksMade(this.attacksMade);
      setExhaustionAction.setSource(this.getCard());
      setExhaustionAction.setTarget(this.getCard());
      return this.getCard().getGameSession().executeAction(setExhaustionAction);
    }
  }
}
ModifierTransformed.prototype.type = 'ModifierTransformed';
ModifierTransformed.prototype.maxStacks = 1;
ModifierTransformed.prototype.isRemovable = false;
ModifierTransformed.prototype.isInherent = true;
ModifierTransformed.prototype.activeInDeck = false;
ModifierTransformed.prototype.activeInHand = false;
ModifierTransformed.prototype.activeInSignatureCards = false;
ModifierTransformed.prototype.isCloneable = false;
ModifierTransformed.prototype.fxResource = ['FX.Modifiers.ModifierTransformed'];

module.exports = ModifierTransformed;
