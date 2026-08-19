/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const AttackAction = require('app/sdk/actions/attackAction');
const ForcedAttackAction = require('app/sdk/actions/forcedAttackAction');
const ModifierStrikeback = require('app/sdk/modifiers/modifierStrikeback');
const Modifier = require('./modifier');

class ModifierMyAttackOrCounterattackWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierMyAttackOrCounterattackWatch';

  onAction(event) {
    super.onAction(event);
    const {
      action,
    } = event;
    if ((action.getSource() === this.getCard()) && ((action instanceof AttackAction && (!action.getIsImplicit() || action.getTriggeringModifier() instanceof ModifierStrikeback)) || action instanceof ForcedAttackAction)) {
      return this.onMyAttackOrCounterattackWatch(action);
    }
  }

  onMyAttackOrCounterattackWatch(action) {}
}
ModifierMyAttackOrCounterattackWatch.prototype.type = 'ModifierMyAttackOrCounterattackWatch';
ModifierMyAttackOrCounterattackWatch.prototype.activeInHand = false;
ModifierMyAttackOrCounterattackWatch.prototype.activeInDeck = false;
ModifierMyAttackOrCounterattackWatch.prototype.activeInSignatureCards = false;
ModifierMyAttackOrCounterattackWatch.prototype.activeOnBoard = true;
ModifierMyAttackOrCounterattackWatch.prototype.fxResource = ['FX.Modifiers.ModifierMyAttackWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierMyAttackOrCounterattackWatch;
