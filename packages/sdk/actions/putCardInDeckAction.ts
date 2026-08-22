/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const UtilsJavascript = require('app/common/utils/utils_javascript');
const Action = require('./action');
const CardType = require('@duelyst/sdk/cards/cardType');
const _ = require('underscore');

class PutCardInDeckAction extends Action {
  declare targetPlayerId: any;
  declare cardDataOrIndex: any;
  declare getTarget: any;

  static type = 'PutCardInDeckAction';

  constructor(gameSession, targetPlayerId, cardDataOrIndex) {
    super(gameSession);
    this.targetPlayerId = targetPlayerId;

    if (cardDataOrIndex != null) {
      // copy data so we don't modify anything unintentionally
      if (_.isObject(cardDataOrIndex)) {
        this.cardDataOrIndex = UtilsJavascript.fastExtend({}, cardDataOrIndex);
      } else {
        this.cardDataOrIndex = cardDataOrIndex;
      }
    }
  }

  getPrivateDefaults(gameSession) {
    const p = super.getPrivateDefaults(gameSession);

    p.cachedCard = null;

    return p;
  }

  isRemovableDuringScrubbing() {
    return false;
  }

  /**
   * Returns the card data or index used to create card that will be applied.
   */
  getCardDataOrIndex() {
    return this.cardDataOrIndex;
  }

  /**
   * Returns the card.
   * NOTE: This card may or may not be indexed if this method is called before this action is executed.
   * @returns {Card}
   */
  getCard() {
    if (this._private.cachedCard == null) {
      this._private.cachedCard = this.getGameSession().getExistingCardFromIndexOrCreateCardFromData(
        this.cardDataOrIndex,
      );
      if (this._private.cachedCard != null) {
        this._private.cachedCard.setOwnerId(this.getOwnerId());
      }
    }
    return this._private.cachedCard;
  }

  /**
   * Explicitly sets the card.
   * NOTE: This card reference is not serialized and will not be preserved through deserialize/rollback.
   */
  setCard(card) {
    return (this._private.cachedCard = card);
  }

  _execute() {
    super._execute();

    if (this.targetPlayerId != null && this.cardDataOrIndex != null) {
      // Logger.module("SDK").debug "[G:#{@.getGameSession().gameId}]", "PutCardOnTopOfDeckAction::execute"
      const card = this.getCard();
      const deck = this.getGameSession().getPlayerById(this.targetPlayerId).getDeck();

      // regenerate card data so we transmit the correct values to the clients
      if (this.getGameSession().getIsRunningAsAuthoritative()) {
        if (card.getIsFollowup()) {
          // followups should ignore incoming card data
          this.cardDataOrIndex = card.createCardData();
        } else {
          // apply incoming card data before regenerating
          card.applyCardData(this.cardDataOrIndex);
          this.cardDataOrIndex = card.createCardData(this.cardDataOrIndex);
        }

        // flag card data as applied locally so that we don't reapply regenerated data for clients
        this.cardDataOrIndex._hasBeenApplied = true;
      }

      // apply the card through the game session
      this.getGameSession().applyCardToDeck(deck, this.cardDataOrIndex, card, this);

      // get post apply card data
      if (this.getGameSession().getIsRunningAsAuthoritative()) {
        return (this.cardDataOrIndex = card.updateCardDataPostApply(this.cardDataOrIndex));
      }
    }
  }

  scrubSensitiveData(actionData, scrubFromPerspectiveOfPlayerId, forSpectator) {
    // scrub the card id and only retain the card index
    if (forSpectator || actionData.ownerId !== scrubFromPerspectiveOfPlayerId) {
      if (actionData.cardDataOrIndex != null && _.isObject(actionData.cardDataOrIndex)) {
        actionData.cardDataOrIndex = { id: -1, index: actionData.cardDataOrIndex.index };
      }
    }
    return actionData;
  }
}
PutCardInDeckAction.prototype.targetPlayerId = null;
PutCardInDeckAction.prototype.cardDataOrIndex = null;
PutCardInDeckAction.prototype.getTarget = PutCardInDeckAction.prototype.getCard;

module.exports = PutCardInDeckAction;
