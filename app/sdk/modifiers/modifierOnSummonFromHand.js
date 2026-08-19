/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardAction = require('app/sdk/actions/playCardAction');
const ApplyModifierAction = require('app/sdk/actions/applyModifierAction');
const Modifier = require('./modifier');

class ModifierOnSummonFromHand extends Modifier {
  static type = 'ModifierOnSummonFromHand';

  onActivate() {
    super.onActivate();

    if (!this.triggered && this.getCard().getIsPlayed()) {
      // always flag self as triggered when card becomes played
      this.triggered = true;
      let executingAction = this.getGameSession().getExecutingAction();

      // account for modifier activated by being applied
      if ((executingAction != null) && executingAction instanceof ApplyModifierAction) {
        const parentAction = executingAction.getParentAction();
        if (parentAction instanceof PlayCardAction) { executingAction = parentAction; }
      }

      if ((executingAction == null) || (executingAction instanceof PlayCardAction && (executingAction.getCard() === this.getCard()))) {
        // only trigger when played PlayCardAction or no action (i.e. during game setup)
        this.getGameSession().p_startBufferingEvents();
        return this.onSummonFromHand();
      }
    }
  }

  getIsActiveForCache() {
    return !this.triggered && super.getIsActiveForCache();
  }

  onSummonFromHand() {}
}
ModifierOnSummonFromHand.prototype.type = 'ModifierOnSummonFromHand';
ModifierOnSummonFromHand.prototype.activeInHand = false;
ModifierOnSummonFromHand.prototype.activeInDeck = false;
ModifierOnSummonFromHand.prototype.activeInSignatureCards = false;
ModifierOnSummonFromHand.prototype.activeOnBoard = true;
ModifierOnSummonFromHand.prototype.triggered = false;
// override me in sub classes to implement special behavior

module.exports = ModifierOnSummonFromHand;
