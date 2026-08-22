/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PutCardInHandAction = require('@duelyst/sdk/actions/putCardInHandAction');
const Races = require('@duelyst/sdk/cards/racesLookup');
const GameFormat = require('@duelyst/sdk/gameFormat');
const ModifierSpellWatch = require('./modifierSpellWatch');
const Modifier = require('./modifier');

class ModifierSpellWatchDrawRandomArcanyst extends ModifierSpellWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierSpellWatchDrawRandomArcanyst';
  static modifierName = 'Spell Watch';
  static description = 'Whenever you cast a spell, draw a random Arcanyst';

  onSpellWatch(action) {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      let arcanystCards = [];
      if (this.getGameSession().getGameFormat() === GameFormat.Standard) {
        arcanystCards = this.getGameSession()
          .getCardCaches()
          .getIsLegacy(false)
          .getRace(Races.Arcanyst)
          .getIsToken(false)
          .getIsHiddenInCollection(false)
          .getIsPrismatic(false)
          .getIsSkinned(false)
          .getCards();
      } else {
        arcanystCards = this.getGameSession()
          .getCardCaches()
          .getRace(Races.Arcanyst)
          .getIsToken(false)
          .getIsHiddenInCollection(false)
          .getIsPrismatic(false)
          .getIsSkinned(false)
          .getCards();
      }
      if (arcanystCards.length > 0) {
        const arcanystCard =
          arcanystCards[this.getGameSession().getRandomIntegerForExecution(arcanystCards.length)];
        const cardData = arcanystCard.createNewCardData();
        const a = new PutCardInHandAction(
          this.getGameSession(),
          this.getCard().getOwnerId(),
          cardData,
        );
        return this.getGameSession().executeAction(a);
      }
    }
  }
}
ModifierSpellWatchDrawRandomArcanyst.prototype.type = 'ModifierSpellWatchDrawRandomArcanyst';
ModifierSpellWatchDrawRandomArcanyst.prototype.fxResource = ['FX.Modifiers.ModifierSpellWatch'];

module.exports = ModifierSpellWatchDrawRandomArcanyst;
