/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const ModifierDyingWish = require('@duelyst/sdk/modifiers/modifierDyingWish');
const PlayCardSilentlyAction = require('@duelyst/sdk/actions/playCardSilentlyAction');

class ModifierUnseven extends ModifierDyingWish {
  declare type: any;
  declare activeInDeck: any;
  declare activeInHand: any;

  static type = 'ModifierUnseven';
  static description = 'Summon a minion with Dying Wish from your action bar';

  onDyingWish(action) {
    super.onDyingWish(action);

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const cardsInHand = this.getCard().getOwner().getDeck().getCardsInHandExcludingMissing();
      const possibleCardsToSummon = [];
      for (var card of Array.from<any>(cardsInHand)) {
        // search for keyword class Dying Wish AND Dying Wish modifier
        // searching by keyword class because some units have "dying wishes" that are not specified as Dying Wish keyword
        // (ex - Snow Chaser 'replicate')
        // but don't want to catch minions that grant others Dying Wish (ex - Ancient Grove)
        for (var kwClass of Array.from<any>(card.getKeywordClasses())) {
          if (
            kwClass.belongsToKeywordClass(ModifierDyingWish) &&
            card.hasModifierClass(ModifierDyingWish)
          ) {
            // if we find an "Dying Wish"
            possibleCardsToSummon.push(card);
          }
        }
      }

      if (possibleCardsToSummon.length > 0) {
        const cardToSummon = possibleCardsToSummon.splice(
          this.getGameSession().getRandomIntegerForExecution(possibleCardsToSummon.length),
          1,
        )[0];
        const playCardAction = new PlayCardSilentlyAction(
          this.getGameSession(),
          this.getCard().getOwnerId(),
          this.getCard().getPositionX(),
          this.getCard().getPositionY(),
          cardToSummon.getIndex(),
        );
        playCardAction.setSource(this.getCard());
        return this.getGameSession().executeAction(playCardAction);
      }
    }
  }
}
ModifierUnseven.prototype.type = 'ModifierUnseven';
ModifierUnseven.prototype.activeInDeck = false;
ModifierUnseven.prototype.activeInHand = false;

module.exports = ModifierUnseven;
