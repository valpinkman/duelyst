/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Action = require('./action');

class RemoveCardFromDeckAction extends Action {
  static type = 'RemoveCardFromDeckAction';

  constructor(gameSession, cardIndex, targetPlayerId) {
    super(gameSession);

    this.cardIndex = cardIndex;
    this.targetPlayerId = targetPlayerId;
  }

  _execute() {
    super._execute();

    if (this.cardIndex != null) {
      const deck = this.getGameSession().getPlayerById(this.targetPlayerId).getDeck();
      return this.getGameSession().removeCardByIndexFromDeck(deck, this.cardIndex, this.getGameSession().getCardByIndex(this.cardIndex), this);
    }
  }

  getCardIndex() {
    return this.cardIndex;
  }

  getTargetPlayerId() {
    return this.targetPlayerId;
  }
}
RemoveCardFromDeckAction.prototype.targetPlayerId = null;
RemoveCardFromDeckAction.prototype.cardIndex = null;

module.exports = RemoveCardFromDeckAction;
