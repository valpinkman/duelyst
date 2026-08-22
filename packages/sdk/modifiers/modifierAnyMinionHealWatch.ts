/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const HealAction = require('@duelyst/sdk/actions/healAction');
const Modifier = require('./modifier');

class ModifierAnyMinionHealWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierAnyMinionHealWatch';
  static modifierName = 'Any minion HealWatch';
  static description = '';

  // "heal watchers" are not allowed to proc if they die during the step
  onAfterCleanupAction(e) {
    super.onAfterCleanupAction(e);

    const { action } = e;
    // watch for any minion being healed
    const target = action.getTarget();
    if (
      action instanceof HealAction &&
      !target.getIsGeneral() &&
      action.getTotalHealApplied() > 0
    ) {
      return this.onHealWatch(action);
    }
  }

  onHealWatch(action) {}
}
ModifierAnyMinionHealWatch.prototype.type = 'ModifierAnyMinionHealWatch';
ModifierAnyMinionHealWatch.prototype.activeInHand = false;
ModifierAnyMinionHealWatch.prototype.activeInDeck = false;
ModifierAnyMinionHealWatch.prototype.activeInSignatureCards = false;
ModifierAnyMinionHealWatch.prototype.activeOnBoard = true;
ModifierAnyMinionHealWatch.prototype.fxResource = ['FX.Modifiers.ModifierHealWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierAnyMinionHealWatch;
