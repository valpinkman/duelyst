/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const SetExhaustionAction = require('app/sdk/actions/setExhaustionAction');
const CardType = require('app/sdk/cards/cardType');
const Modifier = require('./modifier');

class ModifierSpawnedFromEgg extends Modifier {
  declare type: any;
  declare maxStacks: any;
  declare isRemovable: any;
  declare isCloneable: any;
  declare activeInDeck: any;
  declare activeInHand: any;
  declare activeInSignatureCards: any;
  declare fxResource: any;

  static type = 'ModifierSpawnedFromEgg';
  static modifierName = 'Spawned From Egg';
  static description = 'Spawned From An Egg';
  static isHiddenToUI = true;

  onApplyToCard(card) {
    super.onApplyToCard(card);

    if (this._private.cachedIsActive) {
      // if General ended up in an Egg and is respawning, make sure it is not set as General
      card = this.getCard();
      if (card.getType() === CardType.Unit && card.getIsGeneral()) {
        card.setIsGeneral(false);
      }

      // set exhaustion state of hatched card to not exhausted
      // only do this when this modifier is initially applied to the card
      const setExhaustionAction = this.getGameSession().createActionForType(
        SetExhaustionAction.type,
      );
      setExhaustionAction.setExhausted(false);
      setExhaustionAction.setMovesMade(0);
      setExhaustionAction.setAttacksMade(0);
      setExhaustionAction.setSource(this.getCard());
      setExhaustionAction.setTarget(this.getCard());
      return this.getCard().getGameSession().executeAction(setExhaustionAction);
    }
  }
}
ModifierSpawnedFromEgg.prototype.type = 'ModifierSpawnedFromEgg';
ModifierSpawnedFromEgg.prototype.maxStacks = 1;
ModifierSpawnedFromEgg.prototype.isRemovable = false;
ModifierSpawnedFromEgg.prototype.isCloneable = false;
ModifierSpawnedFromEgg.prototype.activeInDeck = false;
ModifierSpawnedFromEgg.prototype.activeInHand = false;
ModifierSpawnedFromEgg.prototype.activeInSignatureCards = false;
ModifierSpawnedFromEgg.prototype.fxResource = ['FX.Modifiers.ModifierSpawnedFromEgg'];

module.exports = ModifierSpawnedFromEgg;
