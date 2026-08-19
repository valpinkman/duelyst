/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const HealAction = require('app/sdk/actions/healAction');
const Modifier = require('./modifier');

class ModifierHealWatch extends Modifier {
  static type = 'ModifierHealWatch';
  static modifierName = 'HealWatch';
  static description = 'HealWatch';

  // "heal watchers" are not allowed to proc if they die during the step
  onAfterCleanupAction(e) {
    super.onAfterCleanupAction(e);

    const {
      action,
    } = e;
    // watch for ANY  minion or General being healed (actually having HP increased by the heal, not just target of a healAction)
    if (action instanceof HealAction && (action.getTotalHealApplied() > 0)) {
      return this.onHealWatch(action);
    }
  }

  onHealWatch(action) {}
}
ModifierHealWatch.prototype.type = 'ModifierHealWatch';
ModifierHealWatch.prototype.activeInHand = false;
ModifierHealWatch.prototype.activeInDeck = false;
ModifierHealWatch.prototype.activeInSignatureCards = false;
ModifierHealWatch.prototype.activeOnBoard = true;
ModifierHealWatch.prototype.fxResource = ['FX.Modifiers.ModifierHealWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierHealWatch;
