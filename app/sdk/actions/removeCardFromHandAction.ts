/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const Action = require('./action');
const CardType = require('app/sdk/cards/cardType');

class RemoveCardFromHandAction extends Action {
  declare targetPlayerId: any;
  declare indexOfCardInHand: any;

  static type = 'RemoveCardFromHandAction';

  constructor(gameSession, indexOfCardInHand, targetPlayerId) {
    super(gameSession);

    this.indexOfCardInHand = indexOfCardInHand;
    this.targetPlayerId = targetPlayerId;
  }

  _execute() {
    super._execute();
    // Logger.module("SDK").debug "RemoveCardFromHandAction::execute"

    if (this.indexOfCardInHand != null) {
      const deck = this.getGameSession().getPlayerById(this.targetPlayerId).getDeck();
      const cardIndex = deck.getCardIndexInHandAtIndex(this.indexOfCardInHand);
      return this.getGameSession().removeCardByIndexFromHand(
        deck,
        cardIndex,
        this.getGameSession().getCardByIndex(cardIndex),
        this,
      );
    }
  }

  getIndexOfCardInHand() {
    return this.indexOfCardInHand;
  }

  getTargetPlayerId() {
    return this.targetPlayerId;
  }
}
RemoveCardFromHandAction.prototype.targetPlayerId = null;
RemoveCardFromHandAction.prototype.indexOfCardInHand = null;

module.exports = RemoveCardFromHandAction;
