/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const EndTurnAction = require('app/sdk/actions/endTurnAction');
const Stringifiers = require('app/sdk/helpers/stringifiers');
const Modifier = require('./modifier');

class ModifierEndEveryTurnWatch extends Modifier {
  static type = 'ModifierEndEveryTurnWatch';
  static modifierName = 'End Every Turn Watch';
  static description = 'End Every Turn Watch';

  onActivate() {
    super.onActivate();

    // trigger when applied during end of turn
    // but only if this was not applied as a result of the card being played
    if (this.getGameSession().getCurrentTurn().getEnded()) {
      const executingAction = this.getGameSession().getExecutingAction();
      const endTurnAction = executingAction.getMatchingAncestorAction(EndTurnAction);
      if (endTurnAction != null) {
        const playedByAction = this.getCard().getAppliedToBoardByAction();
        if ((playedByAction == null)) {
          return this.onTurnWatch(endTurnAction);
        } if (playedByAction.getIndex() < endTurnAction.getIndex()) {
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
ModifierEndEveryTurnWatch.prototype.type = 'ModifierEndEveryTurnWatch';
ModifierEndEveryTurnWatch.prototype.activeInHand = false;
ModifierEndEveryTurnWatch.prototype.activeInDeck = false;
ModifierEndEveryTurnWatch.prototype.activeInSignatureCards = false;
ModifierEndEveryTurnWatch.prototype.activeOnBoard = true;
ModifierEndEveryTurnWatch.prototype.fxResource = ['FX.Modifiers.ModifierEndEveryTurnWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierEndEveryTurnWatch;
