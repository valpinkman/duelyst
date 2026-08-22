/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifierEmblem = require('./playerModifierEmblem');
const EndTurnAction = require('@duelyst/sdk/actions/endTurnAction');

class PlayerModifierEmblemEndTurnWatch extends PlayerModifierEmblem {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;
  declare activeOnMyTurn: any;
  declare activeOnEnemyTurn: any;

  static type = 'PlayerModifierEmblemEndTurnWatch';

  static createContextObject(activeOnMyTurn, activeOnEnemyTurn, options) {
    if (activeOnMyTurn == null) {
      activeOnMyTurn = true;
    }
    if (activeOnEnemyTurn == null) {
      activeOnEnemyTurn = false;
    }
    const contextObject = super.createContextObject(options);
    contextObject.activeOnMyTurn = activeOnMyTurn;
    contextObject.activeOnEnemyTurn = activeOnEnemyTurn;
    return contextObject;
  }

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
    if (
      (this.activeOnMyTurn &&
        this.getGameSession().getCurrentPlayer().getPlayerId() === this.getCard().getOwnerId()) ||
      (this.activeOnEnemyTurn &&
        this.getGameSession().getCurrentPlayer().getPlayerId() !== this.getCard().getOwnerId())
    ) {
      return this.onTurnWatch(this.getGameSession().getExecutingAction());
    }
  }

  onTurnWatch(action) {}
}
PlayerModifierEmblemEndTurnWatch.prototype.type = 'PlayerModifierEmblemEndTurnWatch';
PlayerModifierEmblemEndTurnWatch.prototype.activeInHand = false;
PlayerModifierEmblemEndTurnWatch.prototype.activeInDeck = false;
PlayerModifierEmblemEndTurnWatch.prototype.activeInSignatureCards = false;
PlayerModifierEmblemEndTurnWatch.prototype.activeOnBoard = true;
PlayerModifierEmblemEndTurnWatch.prototype.fxResource = ['FX.Modifiers.ModifierEndTurnWatch'];
PlayerModifierEmblemEndTurnWatch.prototype.activeOnMyTurn = true;
PlayerModifierEmblemEndTurnWatch.prototype.activeOnEnemyTurn = false;
// override me in sub classes to implement special behavior

module.exports = PlayerModifierEmblemEndTurnWatch;
