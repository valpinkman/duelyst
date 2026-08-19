/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardFromHandAction = require('app/sdk/actions/playCardFromHandAction');
const PlaySignatureCardAction = require('app/sdk/actions/playSignatureCardAction');
const CardType = require('app/sdk/cards/cardType');
const Cards = require('app/sdk/cards/cardsLookupComplete');
const ModifierManaCostChange = require('./modifierManaCostChange');
const Modifier = require('./modifier');

class ModifierPantheran extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare hasPlayedWish1: any;
  declare hasPlayedWish2: any;
  declare hasPlayedWish3: any;
  declare fxResource: any;

  static type = 'ModifierPantheran';
  static modifierName = 'Scion\'s Watch';
  static description = 'Costs 0 if you\'ve cast all three Scion\'s Wish spells this game';

  onAction(e) {
    super.onAction(e);

    // watch for all 3 of scion's wishes having been cast
    if (!this.getHasPlayedScionsWishes() && this.checkForScionsWishes(e.action)) {
      return this.onHasPlayedScionsWishes();
    }
  }

  onActivate() {
    // special check on activation in case this card is created mid-game
    // need to check all actions that occured this gamesession for triggers
    if (!this.getHasPlayedScionsWishes() && (this.getGameSession().findAction(this.checkForScionsWishes.bind(this)) != null)) {
      return this.onHasPlayedScionsWishes();
    }
  }

  checkForScionsWishes(action) {
    // we're watching for a spell (but not a followup) being cast by this modifier's owner
    if ((action instanceof PlayCardFromHandAction || action instanceof PlaySignatureCardAction) && (action.getOwnerId() === this.getCard().getOwnerId())) {
      const card = action.getCard();
      if ((card != null ? card.type : undefined) === CardType.Spell) {
        const baseCardId = card.getBaseCardId();
        if (baseCardId === Cards.Spell.ScionsFirstWish) {
          this.hasPlayedWish1 = true;
        } else if (baseCardId === Cards.Spell.ScionsSecondWish) {
          this.hasPlayedWish2 = true;
        } else if (baseCardId === Cards.Spell.ScionsThirdWish) {
          this.hasPlayedWish3 = true;
        }
      }
    }

    return this.getHasPlayedScionsWishes();
  }

  onHasPlayedScionsWishes() {
    // if so, this minion costs 0
    const manaModifier = ModifierManaCostChange.createContextObject(0);
    manaModifier.attributeBuffsAbsolute = ['manaCost'];
    return this.getGameSession().applyModifierContextObject(manaModifier, this.getCard());
  }

  getHasPlayedScionsWishes() {
    return this.hasPlayedWish1 && this.hasPlayedWish2 && this.hasPlayedWish3;
  }
}
ModifierPantheran.prototype.type = 'ModifierPantheran';
ModifierPantheran.prototype.activeInHand = true;
ModifierPantheran.prototype.activeInDeck = true;
ModifierPantheran.prototype.activeInSignatureCards = false;
ModifierPantheran.prototype.activeOnBoard = true;
ModifierPantheran.prototype.hasPlayedWish1 = false;
ModifierPantheran.prototype.hasPlayedWish2 = false;
ModifierPantheran.prototype.hasPlayedWish3 = false;
ModifierPantheran.prototype.fxResource = ['FX.Modifiers.ModifierPantheran'];

module.exports = ModifierPantheran;
