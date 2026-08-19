/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const GameFormat = require('app/sdk/gameFormat');
const _ = require('underscore');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitDrawFactionCards extends ModifierOpeningGambit {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitDrawFactionCards';
  static modifierName = 'Opening Gambit';
  static description = 'Add 2 random cards from your Faction to your action bar';

  onOpeningGambit(action) {
    super.onOpeningGambit(action);

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const factionId = this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId()).getFactionId();
      let factionCards = [];
      if (this.getGameSession().getGameFormat() === GameFormat.Standard) {
        factionCards = this.getGameSession().getCardCaches().getIsLegacy(false).getFaction(factionId)
          .getIsHiddenInCollection(false)
          .getIsToken(false)
          .getIsGeneral(false)
          .getIsPrismatic(false)
          .getIsSkinned(false)
          .getCards();
      } else {
        factionCards = this.getGameSession().getCardCaches().getFaction(factionId).getIsHiddenInCollection(false)
          .getIsToken(false)
          .getIsGeneral(false)
          .getIsPrismatic(false)
          .getIsSkinned(false)
          .getCards();
      }

      if ((factionCards != null ? factionCards.length : undefined) > 0) {
        // filter mythron cards
        factionCards = _.reject(factionCards, (card) => card.getRarityId() === 6);
      }

      if (factionCards.length > 0) {
        let cardToPutInHand = factionCards[this.getGameSession().getRandomIntegerForExecution(factionCards.length)];
        const a = new PutCardInHandAction(this.getGameSession(), this.getCard().getOwnerId(), cardToPutInHand.createNewCardData());

        cardToPutInHand = factionCards[this.getGameSession().getRandomIntegerForExecution(factionCards.length)];
        const a2 = new PutCardInHandAction(this.getGameSession(), this.getCard().getOwnerId(), cardToPutInHand.createNewCardData());

        this.getGameSession().executeAction(a);
        return this.getGameSession().executeAction(a2);
      }
    }
  }
}
ModifierOpeningGambitDrawFactionCards.prototype.type = 'ModifierOpeningGambitDrawFactionCards';
ModifierOpeningGambitDrawFactionCards.prototype.fxResource = ['FX.Modifiers.ModifierOpeningGambit'];

module.exports = ModifierOpeningGambitDrawFactionCards;
