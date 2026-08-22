/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const PutCardInHandAction = require('@duelyst/sdk/actions/putCardInHandAction');
const GameFormat = require('@duelyst/sdk/gameFormat');
const ModifierManaCostChange = require('./modifierManaCostChange');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitGrincher extends ModifierOpeningGambit {
  declare type: any;

  static type = 'ModifierOpeningGambitGrincher';
  static description = 'Put a random artifact into your action bar. It costs 2 less';

  onOpeningGambit() {
    super.onOpeningGambit();

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      let artifactCards = [];
      if (this.getGameSession().getGameFormat() === GameFormat.Standard) {
        artifactCards = this.getGameSession()
          .getCardCaches()
          .getIsLegacy(false)
          .getType(CardType.Artifact)
          .getIsHiddenInCollection(false)
          .getIsPrismatic(false)
          .getIsSkinned(false)
          .getCards();
      } else {
        artifactCards = this.getGameSession()
          .getCardCaches()
          .getType(CardType.Artifact)
          .getIsHiddenInCollection(false)
          .getIsPrismatic(false)
          .getIsSkinned(false)
          .getCards();
      }
      if (artifactCards.length > 0) {
        const artifactCard =
          artifactCards[this.getGameSession().getRandomIntegerForExecution(artifactCards.length)]; // random artifact
        const cardDataOrIndexToPutInHand = artifactCard.createNewCardData();
        const costChangeContextObject = ModifierManaCostChange.createContextObject(-3);
        costChangeContextObject.appliedName = 'Grinched';
        cardDataOrIndexToPutInHand.additionalModifiersContextObjects = [costChangeContextObject];
        const a = new PutCardInHandAction(
          this.getGameSession(),
          this.getCard().getOwnerId(),
          cardDataOrIndexToPutInHand,
        );
        return this.getGameSession().executeAction(a);
      }
    }
  }
}
ModifierOpeningGambitGrincher.prototype.type = 'ModifierOpeningGambitGrincher';

module.exports = ModifierOpeningGambitGrincher;
