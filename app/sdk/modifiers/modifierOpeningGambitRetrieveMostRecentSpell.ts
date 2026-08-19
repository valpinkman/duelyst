/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitRetrieveMostRecentSpell extends ModifierOpeningGambit {
  declare type: any;

  static type = 'ModifierOpeningGambitRetrieveMostRecentSpell';
  static modifierName = 'Opening Gambit';
  static description = 'Put a copy of the most recently cast spell into your action bar';

  onOpeningGambit() {
    const spellsPlayedToBoard = this.getGameSession().getSpellsPlayed();
    if (spellsPlayedToBoard.length > 0) {
      let spellToCopy;
      for (let i = spellsPlayedToBoard.length - 1; i >= 0; i--) {
        var spell = spellsPlayedToBoard[i];
        if (!spell.getIsFollowup()) {
          spellToCopy = spell;
          break;
        }
      }

      if (spellToCopy != null) {
        // put fresh copy of spell into hand
        const a = new PutCardInHandAction(this.getGameSession(), this.getCard().getOwnerId(), spellToCopy.createNewCardData());
        return this.getGameSession().executeAction(a);
      }
    }
  }
}
ModifierOpeningGambitRetrieveMostRecentSpell.prototype.type = 'ModifierOpeningGambitRetrieveMostRecentSpell';

module.exports = ModifierOpeningGambitRetrieveMostRecentSpell;
