/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierManaCostChange = require('@duelyst/sdk/modifiers/modifierManaCostChange');
const PutCardInHandAction = require('@duelyst/sdk/actions/putCardInHandAction');
const ModifierSentinelOpponentSummon = require('./modifierSentinelOpponentSummon');

class ModifierSentinelOpponentSummonCopyIt extends ModifierSentinelOpponentSummon {
  declare type: any;

  static type = 'ModifierSentinelOpponentSummonCopyIt';

  onOverwatch(action) {
    super.onOverwatch(action); // transform unit
    // damage unit that was just summoned by enemy
    if (action.getTarget() != null) {
      const costChangeModifer = ModifierManaCostChange.createContextObject(-2);
      costChangeModifer.appliedName = 'Tormented Loyalty';
      const newCardData = action.getTarget().createNewCardData();
      newCardData.additionalModifiersContextObjects = [costChangeModifer];
      const putCardInHandAction = new PutCardInHandAction(
        this.getGameSession(),
        this.getCard().getOwnerId(),
        newCardData,
      );
      return this.getGameSession().executeAction(putCardInHandAction);
    }
  }
}
ModifierSentinelOpponentSummonCopyIt.prototype.type = 'ModifierSentinelOpponentSummonCopyIt';

module.exports = ModifierSentinelOpponentSummonCopyIt;
