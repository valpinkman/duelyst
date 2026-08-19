/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const UtilsGameSession = require('app/common/utils/utils_game_session');
const Spell = require('./spell');
const CardType = require('app/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const _ = require('underscore');

class SpellApplyModifiersToUnitsInHand extends Spell {
  onApplyToBoard(board, x, y, sourceAction) {
    super.onApplyToBoard(board, x, y, sourceAction);

    return Array.from(this.getCardsAffected()).map((card) =>
      Array.from(this.targetModifiersContextObjects).map((modifierContextObject) =>
        this.getGameSession().applyModifierContextObject(modifierContextObject, card)));
  }

  getCardsAffected() {
    let deck;
    const cardType = this.cardTypeToTarget;
    const raceId = this.raceIdToTarget;
    let cards = [];

    if (this.applyToOwnPlayer) {
      deck = this.getOwner().getDeck();
      cards = deck.getCardsInHand();
    }

    if (this.applyToEnemyPlayer) {
      deck = this.getGameSession().getOpponentPlayerOfPlayerId(this.getOwnerId()).getDeck();
      cards = deck.getCardsInHand();
    }

    return _.filter(cards, (card) => (card != null) && (!cardType || (card.getType() === cardType)) && (!raceId || card.getBelongsToTribe(raceId)));
  }
}
SpellApplyModifiersToUnitsInHand.prototype.targetType = CardType.Unit;
SpellApplyModifiersToUnitsInHand.prototype.spellFilterType = SpellFilterType.NeutralIndirect;
SpellApplyModifiersToUnitsInHand.prototype.applyToOwnPlayer = false;
SpellApplyModifiersToUnitsInHand.prototype.applyToEnemyPlayer = false;
SpellApplyModifiersToUnitsInHand.prototype.cardTypeToTarget = CardType.Unit;
SpellApplyModifiersToUnitsInHand.prototype.raceIdToTarget = null;

module.exports = SpellApplyModifiersToUnitsInHand;
