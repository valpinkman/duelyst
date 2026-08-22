/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ApplyModifierAction = require('@duelyst/sdk/actions/applyModifierAction');
const ModifierStunned = require('@duelyst/sdk/modifiers/modifierStunned');
const ModifierStunnedVanar = require('@duelyst/sdk/modifiers/modifierStunnedVanar');
const ModifierStun = require('@duelyst/sdk/modifiers/modifierStun');
const Modifier = require('./modifier');

class ModifierEnemyStunWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierEnemyStunWatch';

  onBeforeAction(e) {
    super.onBeforeAction(e);

    const { action } = e;

    // watch for a stun being used on an enemy
    if (
      action instanceof ApplyModifierAction &&
      (action.getModifier() instanceof ModifierStunned ||
        action.getModifier() instanceof ModifierStunnedVanar ||
        action.getModifier() instanceof ModifierStun) &&
      action.getTarget().getOwnerId() !== this.getCard().getOwnerId()
    ) {
      return this.onEnemyStunWatch(action);
    }
  }

  onEnemyStunWatch(action) {}
}
ModifierEnemyStunWatch.prototype.type = 'ModifierEnemyStunWatch';
ModifierEnemyStunWatch.prototype.activeInHand = false;
ModifierEnemyStunWatch.prototype.activeInDeck = false;
ModifierEnemyStunWatch.prototype.activeInSignatureCards = false;
ModifierEnemyStunWatch.prototype.activeOnBoard = true;
ModifierEnemyStunWatch.prototype.fxResource = ['FX.Modifiers.ModifierSpellWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierEnemyStunWatch;
