/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const UtilsGameSession = require('app/common/utils/utils_game_session');
const CardType = require('app/sdk/cards/cardType');
const _ = require('underscore');
const ModifierOpeningGambit = require('./modifierOpeningGambit');
const Modifier = require('./modifier');

/*
 Modifier is used to apply modifiers to cards in deck and hand when a card is played to the board.
*/
class ModifierOpeningGambitApplyModifiersToDeck extends ModifierOpeningGambit {
  declare type: any;
  declare modifiersContextObjects: any;
  declare managedByCard: any;
  declare applyToOwnPlayer: any;
  declare applyToEnemyPlayer: any;
  declare cardType: any;
  declare raceId: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitApplyModifiersToDeck';
  static description = '';

  static createContextObject(modifiersContextObjects, managedByCard, applyToOwnPlayer, applyToEnemyPlayer, cardType, raceId = null, description, options) {
    if (managedByCard == null) { managedByCard = false; }
    if (applyToOwnPlayer == null) { applyToOwnPlayer = false; }
    if (applyToEnemyPlayer == null) { applyToEnemyPlayer = false; }
    if (cardType == null) { cardType = CardType.Unit; }
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifiersContextObjects;
    contextObject.managedByCard = managedByCard;
    contextObject.applyToOwnPlayer = applyToOwnPlayer;
    contextObject.applyToEnemyPlayer = applyToEnemyPlayer;
    contextObject.cardType = cardType;
    contextObject.raceId = raceId;
    contextObject.description = description;
    return contextObject;
  }

  static createContextObjectToTargetOwnPlayer(modifiersContextObjects, managedByCard, cardType, raceId, description, options) {
    return this.createContextObject(modifiersContextObjects, managedByCard, true, false, cardType, raceId, description, options);
  }

  static createContextObjectToTargetEnemyPlayer(modifiersContextObjects, managedByCard, cardType, raceId, description, options) {
    return this.createContextObject(modifiersContextObjects, managedByCard, false, true, cardType, raceId, description, options);
  }

  onOpeningGambit() {
    if (this.modifiersContextObjects != null) {
      return Array.from<any>(this.getCardsAffected()).map((card) =>
        Array.from<any>(this.modifiersContextObjects).map((modifierContextObject) =>
          (this.managedByCard
            ? this.getGameSession().applyModifierContextObject(modifierContextObject, card, this)
            : this.getGameSession().applyModifierContextObject(modifierContextObject, card))));
    }
  }

  getCardsAffected() {
    let deck;
    const {
      cardType,
    } = this;
    const {
      raceId,
    } = this;
    let cards = [];

    if (this.applyToOwnPlayer) {
      deck = this.getCard().getOwner().getDeck();
      cards = cards.concat(deck.getCardsInHand(), deck.getCardsInDrawPile());
    }

    if (this.applyToEnemyPlayer) {
      deck = this.getGameSession().getOpponentPlayerOfPlayerId(this.getCard().getOwnerId()).getDeck();
      cards = cards.concat(deck.getCardsInHand(), deck.getCardsInDrawPile());
    }

    return _.filter(cards, (card) => (card != null) && (!cardType || (card.getType() === cardType)) && (!raceId || card.getBelongsToTribe(raceId)));
  }
}
ModifierOpeningGambitApplyModifiersToDeck.prototype.type = 'ModifierOpeningGambitApplyModifiersToDeck';
ModifierOpeningGambitApplyModifiersToDeck.prototype.modifiersContextObjects = null;
ModifierOpeningGambitApplyModifiersToDeck.prototype.managedByCard = false;
ModifierOpeningGambitApplyModifiersToDeck.prototype.applyToOwnPlayer = false;
ModifierOpeningGambitApplyModifiersToDeck.prototype.applyToEnemyPlayer = false;
ModifierOpeningGambitApplyModifiersToDeck.prototype.cardType = CardType.Unit;
ModifierOpeningGambitApplyModifiersToDeck.prototype.raceId = null;
ModifierOpeningGambitApplyModifiersToDeck.prototype.fxResource = ['FX.Modifiers.ModifierOpeningGambit', 'FX.Modifiers.ModifierGenericBuff'];

module.exports = ModifierOpeningGambitApplyModifiersToDeck;
