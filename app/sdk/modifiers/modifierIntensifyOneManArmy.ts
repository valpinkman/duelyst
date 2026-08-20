/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const PutCardInDeckAction = require('app/sdk/actions/putCardInDeckAction');
const Cards = require('app/sdk/cards/cardsLookupComplete');
const ModifierIntensify = require('./modifierIntensify');

class ModifierIntensifyOneManArmy extends ModifierIntensify {
  declare type: any;

  static type = 'ModifierIntensifyOneManArmy';

  onIntensify() {
    for (
      let i = 0, end = this.getIntensifyAmount(), asc = end >= 0;
      asc ? i < end : i > end;
      asc ? i++ : i--
    ) {
      var addCardToHandAction = new PutCardInHandAction(
        this.getGameSession(),
        this.getCard().getOwnerId(),
        { id: Cards.Faction1.KingsGuard },
      );
      this.getGameSession().executeAction(addCardToHandAction);
    }

    const putCardInDeckAction = new PutCardInDeckAction(this.getGameSession(), this.getOwnerId(), {
      id: Cards.Faction1.OneManArmy,
    });
    return this.getGameSession().executeAction(putCardInDeckAction);
  }
}
ModifierIntensifyOneManArmy.prototype.type = 'ModifierIntensifyOneManArmy';

module.exports = ModifierIntensifyOneManArmy;
