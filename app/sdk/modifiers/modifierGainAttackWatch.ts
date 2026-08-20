/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ApplyModifierAction = require('app/sdk/actions/applyModifierAction');
const Modifier = require('./modifier');

class ModifierGainAttackWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierGainAttackWatch';
  static modifierName = 'GainAttackWatch';
  static description = 'GainAttackWatch';

  onAction(e) {
    super.onAction(e);

    const { action } = e;

    // watch for any of my minions gaining Attack
    if (
      action instanceof ApplyModifierAction &&
      action.getTarget().getOwnerId() === this.getCard().getOwnerId() &&
      action.getModifier().getBuffsAttribute('atk') &&
      !__guardMethod__(action.getTarget(), 'getIsGeneral', (o) => o.getIsGeneral())
    ) {
      const modifier = action.getModifier();
      if (
        modifier.getBuffsAttribute('atk') &&
        modifier.attributeBuffs.atk > 0 &&
        !modifier.getRebasesAttribute('atk') &&
        !modifier.getBuffsAttributeAbsolutely('atk')
      ) {
        return this.onGainAttackWatch(action);
      }
    }
  }

  onGainAttackWatch(action) {}
}
ModifierGainAttackWatch.prototype.type = 'ModifierGainAttackWatch';
ModifierGainAttackWatch.prototype.activeInHand = false;
ModifierGainAttackWatch.prototype.activeInDeck = false;
ModifierGainAttackWatch.prototype.activeInSignatureCards = false;
ModifierGainAttackWatch.prototype.activeOnBoard = true;
ModifierGainAttackWatch.prototype.fxResource = ['FX.Modifiers.ModifierGainAttackWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierGainAttackWatch;

function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  }
  return undefined;
}
