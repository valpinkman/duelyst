/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardFromHandAction = require('app/sdk/actions/playCardFromHandAction');
const ModifierSummonWatch = require('./modifierSummonWatch');

class ModifierSummonWatchFromActionBar extends ModifierSummonWatch {
  declare type: any;

  static type = 'ModifierSummonWatchFromActionBar';
  static description = 'Whenever you summon a minion from your action bar, do something';

  getIsActionRelevant(action) {
    return action instanceof PlayCardFromHandAction && (action.getCard() !== this.getCard()) && super.getIsActionRelevant(action);
  }
}
ModifierSummonWatchFromActionBar.prototype.type = 'ModifierSummonWatchFromActionBar';
// watch for a unit being summoned from action bar by the player who owns this entity, don't trigger on summon of this unit

module.exports = ModifierSummonWatchFromActionBar;
