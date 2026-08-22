/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DieAction = require('@duelyst/sdk/actions/dieAction');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const HealAction = require('@duelyst/sdk/actions/healAction');
const HurtingDamageAction = require('@duelyst/sdk/actions/hurtingDamageAction');
const AttackAction = require('@duelyst/sdk/actions/attackAction');
const MoveAction = require('@duelyst/sdk/actions/moveAction');
const ResignAction = require('@duelyst/sdk/actions/resignAction');

const i18next = require('i18next');
const ModifierUntargetable = require('./modifierUntargetable');

class ModifierInvulnerable extends ModifierUntargetable {
  declare type: any;
  declare maxStacks: any;
  declare isRemovable: any;
  declare fxResource: any;
  declare static keywordDefinition: any;
  declare static modifierName: any;

  static type = 'ModifierInvulnerable';
  static isKeyworded = true;
  static description = null;

  onValidateAction(event) {
    super.onValidateAction(event);

    const { action } = event;

    // when this would die, invalidate the death UNLESS it is a player initiated resign
    if (
      action instanceof DieAction &&
      !(action instanceof ResignAction) &&
      action.getTarget() === this.getCard()
    ) {
      return this.invalidateAction(action);
      // invalidate any damage actions against this, EXCEPT from card draw fatigue damage
    }
    if (
      action instanceof DamageAction &&
      action.getTarget() === this.getCard() &&
      !(action instanceof HurtingDamageAction)
    ) {
      return this.invalidateAction(action);
      // invalidate any heal actions that target this
    }
    if (action instanceof HealAction && action.getTarget() === this.getCard()) {
      return this.invalidateAction(action);
      // if this somehow tries to attack or move, invalidate that action
    }
    if (
      (action instanceof MoveAction || action instanceof AttackAction) &&
      action.getSource() === this.getCard()
    ) {
      return this.invalidateAction(action);
    }
  }
}
ModifierInvulnerable.prototype.type = 'ModifierInvulnerable';
ModifierInvulnerable.keywordDefinition = i18next.t('modifiers.invulnerable_def');
ModifierInvulnerable.modifierName = i18next.t('modifiers.invulnerable_name');
ModifierInvulnerable.prototype.maxStacks = 1;
ModifierInvulnerable.prototype.isRemovable = false;
ModifierInvulnerable.prototype.fxResource = ['FX.Modifiers.ModifierInvulnerable'];

module.exports = ModifierInvulnerable;
