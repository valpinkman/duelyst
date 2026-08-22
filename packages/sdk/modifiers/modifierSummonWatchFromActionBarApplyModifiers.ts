/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardFromHandAction = require('@duelyst/sdk/actions/playCardFromHandAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const ModifierSummonWatchApplyModifiers = require('./modifierSummonWatchApplyModifiers');

class ModifierSummonWatchFromActionBarApplyModifiers extends ModifierSummonWatchApplyModifiers {
  declare type: any;

  static type = 'ModifierSummonWatchFromActionBarApplyModifiers';
  static description = 'Minions summoned from your action bar, gain %X';

  getIsActionRelevant(action) {
    return (
      action instanceof PlayCardFromHandAction &&
      action.getCard() !== this.getCard() &&
      super.getIsActionRelevant(action)
    );
  }
}
ModifierSummonWatchFromActionBarApplyModifiers.prototype.type =
  'ModifierSummonWatchFromActionBarApplyModifiers';
// watch for a unit being summoned from action bar by the player who owns this entity, don't trigger on summon of this unit

module.exports = ModifierSummonWatchFromActionBarApplyModifiers;
