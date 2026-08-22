/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const ApplyCardToBoardAction = require('@duelyst/sdk/actions/applyCardToBoardAction');
const PlayCardAsTransformAction = require('@duelyst/sdk/actions/playCardAsTransformAction');
const CloneEntityAsTransformAction = require('@duelyst/sdk/actions/cloneEntityAsTransformAction');
const i18next = require('i18next');
const ModifierSentinel = require('./modifierSentinel');

class ModifierSentinelOpponentSummon extends ModifierSentinel {
  declare type: any;
  declare static description: any;

  static type = 'ModifierSentinelOpponentSummon';

  static getDescription(modifierContextObject) {
    if (modifierContextObject != null) {
      return this.description;
    }
    return super.getDescription();
  }

  getCanReactToAction(action) {
    return (
      super.getCanReactToAction(action) &&
      this.getGameSession().getCanCardBeScheduledForRemoval(this.getCard())
    );
  }

  getIsActionRelevant(action) {
    // watch for a unit being summoned in any way by the opponent of player who owns this entity
    if (
      action instanceof ApplyCardToBoardAction &&
      action.getOwnerId() !== this.getCard().getOwnerId() &&
      __guard__(action.getCard(), (x) => x.type) === CardType.Unit &&
      action.getCard() !== this.getCard()
    ) {
      // don't react to transforms
      if (
        !(
          action instanceof PlayCardAsTransformAction ||
          action instanceof CloneEntityAsTransformAction
        )
      ) {
        return true;
      }
    }
    return false;
  }
}
ModifierSentinelOpponentSummon.prototype.type = 'ModifierSentinelOpponentSummon';
ModifierSentinelOpponentSummon.description = i18next.t('modifiers.sentinel_summon');

module.exports = ModifierSentinelOpponentSummon;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
