/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const EndTurnAction = require('app/sdk/actions/endTurnAction');
const Modifier = require('./modifier');

class ModifierEndTurnWatchAnyPlayer extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierEndTurnWatch';

  onActivate() {
    super.onActivate();

    // trigger when applied during end of turn
    // but only if this was not applied as a result of the card being played
    if (this.getGameSession().getCurrentTurn().getEnded()) {
      const executingAction = this.getGameSession().getExecutingAction();
      const endTurnAction = executingAction.getMatchingAncestorAction(EndTurnAction);
      if (endTurnAction != null) {
        const playedByAction = this.getCard().getAppliedToBoardByAction();
        if (playedByAction == null) {
          return this.onTurnWatch(endTurnAction);
        }
        if (playedByAction.getIndex() < endTurnAction.getIndex()) {
          return this.onTurnWatch(executingAction);
        }
      }
    }
  }

  onEndTurn(e) {
    super.onEndTurn(e);
    return this.onTurnWatch(this.getGameSession().getExecutingAction());
  }

  onTurnWatch(action) {}
}
ModifierEndTurnWatchAnyPlayer.prototype.type = 'ModifierEndTurnWatch';
ModifierEndTurnWatchAnyPlayer.prototype.activeInHand = false;
ModifierEndTurnWatchAnyPlayer.prototype.activeInDeck = false;
ModifierEndTurnWatchAnyPlayer.prototype.activeInSignatureCards = false;
ModifierEndTurnWatchAnyPlayer.prototype.activeOnBoard = true;
ModifierEndTurnWatchAnyPlayer.prototype.fxResource = ['FX.Modifiers.ModifierEndTurnWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierEndTurnWatchAnyPlayer;
