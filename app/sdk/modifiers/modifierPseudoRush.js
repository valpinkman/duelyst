/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const SetExhaustionAction = require('app/sdk/actions/setExhaustionAction');
const CardType = require('app/sdk/cards/cardType');
const RefreshExhaustionAction = require('app/sdk/actions/refreshExhaustionAction');
const Modifier = require('./modifier');

class ModifierPseudoRush extends Modifier {
  static type = 'ModifierPseudoRush';
  static isHiddenToUI = true;

  onActivate(card) {
    super.onActivate(card);

    if ((this.getCard().getMovesMade() === 0) && (this.getCard().getAttacksMade() === 0)) {
      const refreshExhaustionAction = this.getGameSession().createActionForType(RefreshExhaustionAction.type);
      refreshExhaustionAction.setSource(this.getCard());
      refreshExhaustionAction.setTarget(this.getCard());
      this.getCard().getGameSession().executeAction(refreshExhaustionAction);
    }

    if (this._private.cachedIsActive) {
      // if General ended up in an Egg and is respawning, make sure it is not set as General
      card = this.getCard();
      if ((card.getType() === CardType.Unit) && card.getIsGeneral()) {
        card.setIsGeneral(false);
      }

      // set exhaustion state of hatched card to not exhausted
      // only do this when this modifier is initially applied to the card
      const setExhaustionAction = this.getGameSession().createActionForType(SetExhaustionAction.type);
      setExhaustionAction.setExhausted(false);
      setExhaustionAction.setMovesMade(0);
      setExhaustionAction.setAttacksMade(0);
      setExhaustionAction.setSource(this.getCard());
      setExhaustionAction.setTarget(this.getCard());
      return this.getCard().getGameSession().executeAction(setExhaustionAction);
    }
  }
}
ModifierPseudoRush.prototype.type = 'ModifierPseudoRush';
ModifierPseudoRush.prototype.maxStacks = 1;
ModifierPseudoRush.prototype.isRemovable = false;
ModifierPseudoRush.prototype.isCloneable = false;
ModifierPseudoRush.prototype.activeInDeck = false;
ModifierPseudoRush.prototype.activeInHand = false;
ModifierPseudoRush.prototype.activeInSignatureCards = false;
ModifierPseudoRush.prototype.fxResource = ['FX.Modifiers.ModifierSpawnedFromEgg'];

module.exports = ModifierPseudoRush;
