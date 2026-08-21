/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const SwapGeneralAction = require('app/sdk/actions/swapGeneralAction');
const ModifierSummonWatch = require('./modifierSummonWatch');
const ModifierOpponentSummonWatch = require('./modifierOpponentSummonWatch');

class ModifierOpponentSummonWatchSwapGeneral extends ModifierOpponentSummonWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierOpponentSummonWatchSwapGeneral';
  static modifierName = 'Opponent Summon Watch';
  static description = 'Whenever an enemy summons a minion, it becomes their new General';

  static createContextObject(options) {
    const contextObject = super.createContextObject(options);

    return contextObject;
  }

  onSummonWatch(action?) {
    super.onSummonWatch(action);

    const general = this.getGameSession().getGeneralForOpponentOfPlayerId(
      this.getCard().getOwnerId(),
    );
    const newMinion = action.getTarget();

    // turn the new unit into your general
    if (general != null) {
      const swapGeneralAction = new SwapGeneralAction(this.getGameSession());
      swapGeneralAction.setIsDepthFirst(false);
      swapGeneralAction.setSource(general);
      swapGeneralAction.setTarget(newMinion);
      return this.getGameSession().executeAction(swapGeneralAction);
    }
  }
}
ModifierOpponentSummonWatchSwapGeneral.prototype.type = 'ModifierOpponentSummonWatchSwapGeneral';
ModifierOpponentSummonWatchSwapGeneral.prototype.fxResource = [
  'FX.Modifiers.ModifierSummonWatch',
  'FX.Modifiers.ModifierGenericSpawn',
];

module.exports = ModifierOpponentSummonWatchSwapGeneral;
