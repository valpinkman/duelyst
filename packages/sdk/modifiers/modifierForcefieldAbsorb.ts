/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const ModifierImmuneToDamage = require('./modifierImmuneToDamage');

class ModifierForcefieldAbsorb extends ModifierImmuneToDamage {
  declare type: any;
  declare isCloneable: any;
  declare maxStacks: any;
  declare absorbedActionIndex: any;
  declare fxResource: any;

  static type = 'ModifierForcefieldAbsorb';
  static modifierName = 'Forcefield Active';
  static description = 'This minion takes no damage';
  static isHiddenToUI = true;

  onModifyActionForExecution(event) {
    super.onModifyActionForExecution(event);

    const { action } = event;
    if (this.getIsActionRelevant(action)) {
      return (this.absorbedActionIndex = action.getIndex());
    }
  }

  onAfterCleanupAction(event) {
    super.onAfterCleanupAction(event);

    // when cleaning up an action, check if this modifier absorbed damage and remove
    const { action } = event;
    if (
      !this.getCanAbsorb() &&
      (action != null ? action.getIndex() : undefined) === this.absorbedActionIndex
    ) {
      return this.getGameSession().removeModifier(this);
    }
  }

  getIsActionRelevant(action) {
    return this.getCanAbsorb() && super.getIsActionRelevant(action);
  }

  getCanAbsorb() {
    return this.absorbedActionIndex === -1;
  }
}
ModifierForcefieldAbsorb.prototype.type = 'ModifierForcefieldAbsorb';
ModifierForcefieldAbsorb.prototype.isCloneable = false;
ModifierForcefieldAbsorb.prototype.maxStacks = 1;
ModifierForcefieldAbsorb.prototype.absorbedActionIndex = -1;
ModifierForcefieldAbsorb.prototype.fxResource = ['FX.Modifiers.ModifierForcefieldAbsorb'];

module.exports = ModifierForcefieldAbsorb;
