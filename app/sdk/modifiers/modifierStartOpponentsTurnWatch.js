/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Modifier = require('./modifier');

class ModifierStartOpponentsTurnWatch extends Modifier {
  static type = 'ModifierStartOpponentsTurnWatch';

  onStartTurn(e) {
    super.onStartTurn(e);

    if (!this.getCard().isOwnersTurn()) {
      const action = this.getGameSession().getExecutingAction();
      return this.onTurnWatch(action);
    }
  }

  onTurnWatch(action) {}
}
ModifierStartOpponentsTurnWatch.prototype.type = 'ModifierStartOpponentsTurnWatch';
ModifierStartOpponentsTurnWatch.prototype.activeInHand = false;
ModifierStartOpponentsTurnWatch.prototype.activeInDeck = false;
ModifierStartOpponentsTurnWatch.prototype.activeInSignatureCards = false;
ModifierStartOpponentsTurnWatch.prototype.activeOnBoard = true;
// override me in sub classes to implement special behavior

module.exports = ModifierStartOpponentsTurnWatch;
