/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const PlayCardAsTransformAction = require('@duelyst/sdk/actions/playCardAsTransformAction');
const ModifierBuilding = require('@duelyst/sdk/modifiers/modifierBuilding');
const ModifierOpeningGambitProgressBuild = require('@duelyst/sdk/modifiers/modifierOpeningGambitProgressBuild');
const Modifier = require('./modifier');

class ModifierBuildWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierBuildWatch';
  static modifierName = 'Build Watch';
  static description = 'Build Watch';

  onAfterCleanupAction(e) {
    super.onAfterCleanupAction(e);

    const { action } = e;

    // watch for a unit transformed by building complete
    if (this.getIsActionRelevant(action) && this.getIsCardRelevantToWatcher(action.getCard())) {
      return this.onBuildWatch(action);
    }
  }

  getIsActionRelevant(action) {
    return (
      action instanceof PlayCardAsTransformAction &&
      (action.getTriggeringModifier() instanceof ModifierBuilding ||
        action.getTriggeringModifier() instanceof ModifierOpeningGambitProgressBuild)
    );
  }

  onBuildWatch(action) {}
  // override me in sub classes to implement special behavior

  getIsCardRelevantToWatcher(card) {
    return true;
  }
}
ModifierBuildWatch.prototype.type = 'ModifierBuildWatch';
ModifierBuildWatch.prototype.activeInHand = false;
ModifierBuildWatch.prototype.activeInDeck = false;
ModifierBuildWatch.prototype.activeInSignatureCards = false;
ModifierBuildWatch.prototype.activeOnBoard = true;
ModifierBuildWatch.prototype.fxResource = ['FX.Modifiers.ModifierBuildWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierBuildWatch;
