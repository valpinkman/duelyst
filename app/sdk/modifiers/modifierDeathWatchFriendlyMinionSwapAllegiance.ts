/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const SwapUnitAllegianceAction = require('app/sdk/actions/swapUnitAllegianceAction');
const ModifierDeathWatch = require('./modifierDeathWatch');

class ModifierDeathWatchFriendlyMinionSwapAllegiance extends ModifierDeathWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierDeathWatchFriendlyMinionSwapAllegiance';
  static modifierName = 'Deathwatch';
  static description =
    'Whenever a friendly minion is destroyed, your opponent gains control of this minion.';

  onDeathWatch(action) {
    // if the target is a friendly minion
    if (action.getTarget().getOwnerId() === this.getCard().getOwnerId()) {
      const a = new SwapUnitAllegianceAction(this.getGameSession());
      a.setTarget(this.getCard());
      return this.getGameSession().executeAction(a);
    }
  }
}
ModifierDeathWatchFriendlyMinionSwapAllegiance.prototype.type =
  'ModifierDeathWatchFriendlyMinionSwapAllegiance';
ModifierDeathWatchFriendlyMinionSwapAllegiance.prototype.fxResource = [
  'FX.Modifiers.ModifierDeathwatch',
  'FX.Modifiers.ModifierGenericChain',
];

module.exports = ModifierDeathWatchFriendlyMinionSwapAllegiance;
