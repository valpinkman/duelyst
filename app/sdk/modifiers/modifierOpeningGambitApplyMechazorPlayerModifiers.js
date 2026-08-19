/*
 * decaffeinate suggestions:
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifierMechazorBuildProgress = require('app/sdk/playerModifiers/playerModifierMechazorBuildProgress');
const ModifierOpeningGambitApplyPlayerModifiers = require('./modifierOpeningGambitApplyPlayerModifiers');

class ModifierOpeningGambitApplyMechazorPlayerModifiers extends ModifierOpeningGambitApplyPlayerModifiers {
  static initClass() {
    this.prototype.type = 'ModifierOpeningGambitApplyMechazorPlayerModifiers';
    this.type = 'ModifierOpeningGambitApplyMechazorPlayerModifiers';
  }

  static createContextObject(progressAmount, options) {
    if (progressAmount == null) { progressAmount = 1; }
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = [PlayerModifierMechazorBuildProgress.createContextObject(progressAmount)];
    contextObject.managedByCard = false;
    contextObject.applyToOwnPlayer = true;
    contextObject.applyToEnemyPlayer = false;
    return contextObject;
  }
}
ModifierOpeningGambitApplyMechazorPlayerModifiers.initClass();

module.exports = ModifierOpeningGambitApplyMechazorPlayerModifiers;
