/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const SwapUnitAllegianceAction = require('@duelyst/sdk/actions/swapUnitAllegianceAction');
const ModifierEndTurnWatch = require('./modifierEndTurnWatch');

class ModifierEndTurnWatchSwapAllegiance extends ModifierEndTurnWatch {
  declare type: any;
  declare isHiddenToUI: any;
  declare fxResource: any;

  static type = 'ModifierEndTurnWatchSwapAllegiance';
  static modifierName = 'Turn Watch';
  static description = 'At the end of your turn, swap owner';

  onTurnWatch(action) {
    super.onTurnWatch(action);

    const a = new SwapUnitAllegianceAction(this.getCard().getGameSession());
    a.setTarget(this.getCard());
    return this.getGameSession().executeAction(a);
  }
}
ModifierEndTurnWatchSwapAllegiance.prototype.type = 'ModifierEndTurnWatchSwapAllegiance';
ModifierEndTurnWatchSwapAllegiance.prototype.isHiddenToUI = true;
ModifierEndTurnWatchSwapAllegiance.prototype.fxResource = ['FX.Modifiers.ModifierEndTurnWatch'];

module.exports = ModifierEndTurnWatchSwapAllegiance;
