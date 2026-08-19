/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifierSummonWatch = require('./playerModifierSummonWatch');
const PlayCardFromHandAction = require('app/sdk/actions/playCardFromHandAction');

class PlayerModifierSummonWatchFromActionBar extends PlayerModifierSummonWatch {
  declare type: any;

  static type = 'PlayerModifierSummonWatchFromActionBar';

  getIsActionRelevant(action) {
    return action instanceof PlayCardFromHandAction && super.getIsActionRelevant(action);
  }
}
PlayerModifierSummonWatchFromActionBar.prototype.type = 'PlayerModifierSummonWatchFromActionBar';
// watch for a unit being summoned from action bar by the player who owns this entity

module.exports = PlayerModifierSummonWatchFromActionBar;
