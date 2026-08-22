/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierManaCostChange = require('@duelyst/sdk/modifiers/modifierManaCostChange');
const SwapUnitsAction = require('@duelyst/sdk/actions/swapUnitsAction');
const FXType = require('@duelyst/sdk/helpers/fxType');
const CardType = require('@duelyst/sdk/cards/cardType');
const _ = require('underscore');
const ModifierSentinelOpponentSummon = require('./modifierSentinelOpponentSummon');

class ModifierSentinelOpponentSummonSwapPlaces extends ModifierSentinelOpponentSummon {
  declare type: any;

  static type = 'ModifierSentinelOpponentSummonSwapPlaces';

  onOverwatch(action) {
    // damage unit that was just summoned by enemy
    const transformedUnit = super.onOverwatch(action); // transform unit
    if (
      action.getTarget() != null &&
      this.getGameSession().getCanCardBeScheduledForRemoval(transformedUnit, true)
    ) {
      const swapAction = new SwapUnitsAction(this.getGameSession());
      swapAction.setOwnerId(this.getOwnerId());
      swapAction.setSource(transformedUnit);
      swapAction.setTarget(action.getTarget());
      swapAction.setFXResource(_.union(swapAction.getFXResource(), this.getFXResource()));
      return this.getGameSession().executeAction(swapAction);
    }
  }
}
ModifierSentinelOpponentSummonSwapPlaces.prototype.type =
  'ModifierSentinelOpponentSummonSwapPlaces';

module.exports = ModifierSentinelOpponentSummonSwapPlaces;
