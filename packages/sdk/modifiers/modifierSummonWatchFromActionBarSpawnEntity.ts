/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardFromHandAction = require('@duelyst/sdk/actions/playCardFromHandAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const ModifierSummonWatchSpawnEntity = require('./modifierSummonWatchSpawnEntity');

class ModifierSummonWatchFromActionBarSpawnEntity extends ModifierSummonWatchSpawnEntity {
  declare type: any;

  static type = 'ModifierSummonWatchFromActionBarSpawnEntity';
  static description = 'Whenever you summon a minion from your action bar, summon %X';

  getIsActionRelevant(action) {
    return (
      action instanceof PlayCardFromHandAction &&
      action.getCard() !== this.getCard() &&
      super.getIsActionRelevant(action)
    );
  }
}
ModifierSummonWatchFromActionBarSpawnEntity.prototype.type =
  'ModifierSummonWatchFromActionBarSpawnEntity';
// watch for a unit being summoned from action bar by the player who owns this entity, don't trigger on summon of this unit

module.exports = ModifierSummonWatchFromActionBarSpawnEntity;
