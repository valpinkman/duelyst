/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitRetrieveRandomSpell extends ModifierOpeningGambit {
  static type = 'ModifierOpeningGambitRetrieveRandomSpell';
  static modifierName = 'Opening Gambit';
  static description = 'Put a copy of a random spell you cast this game into your action bar';

  onOpeningGambit() {
    super.onOpeningGambit();

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const spellsPlayedToBoard = this.getGameSession().getSpellsPlayed();
      if (spellsPlayedToBoard.length > 0) {
        const ownerId = this.getCard().getOwnerId();
        const spellsPlayedByOwner = [];
        for (var spell of Array.from(spellsPlayedToBoard)) {
          if (!spell.getIsFollowup() && (spell.getOwnerId() === ownerId)) {
            spellsPlayedByOwner.push(spell);
          }
        }

        if (spellsPlayedByOwner.length > 0) {
          const spellToCopy = spellsPlayedByOwner[this.getGameSession().getRandomIntegerForExecution(spellsPlayedByOwner.length)];
          if (spellToCopy != null) {
            // put fresh copy of spell into hand
            const a = new PutCardInHandAction(this.getGameSession(), ownerId, spellToCopy.createNewCardData());
            return this.getGameSession().executeAction(a);
          }
        }
      }
    }
  }
}
ModifierOpeningGambitRetrieveRandomSpell.prototype.type = 'ModifierOpeningGambitRetrieveRandomSpell';

module.exports = ModifierOpeningGambitRetrieveRandomSpell;
