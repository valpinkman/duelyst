/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const AttackAction = require('app/sdk/actions/attackAction');
const ForcedAttackAction = require('app/sdk/actions/forcedAttackAction');
const CardType = require('app/sdk/cards/cardType');
const Modifier = require('./modifier');

class ModifierMyAttackOrAttackedWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierMyAttackOrAttackedWatch';
  static modifierName = 'Attack or Attacked Watch: Self';
  static description = 'Attack or Attacked Watch: Self';

  onAction(event) {
    super.onAction(event);
    const { action } = event;
    if (
      (action.getSource() === this.getCard() || action.getTarget() === this.getCard()) &&
      ((action instanceof AttackAction && !action.getIsImplicit()) ||
        action instanceof ForcedAttackAction)
    ) {
      return this.onMyAttackOrAttackedWatch(action);
    }
  }

  onMyAttackOrAttackedWatch(action) {}
}
ModifierMyAttackOrAttackedWatch.prototype.type = 'ModifierMyAttackOrAttackedWatch';
ModifierMyAttackOrAttackedWatch.prototype.activeInHand = false;
ModifierMyAttackOrAttackedWatch.prototype.activeInDeck = false;
ModifierMyAttackOrAttackedWatch.prototype.activeInSignatureCards = false;
ModifierMyAttackOrAttackedWatch.prototype.activeOnBoard = true;
ModifierMyAttackOrAttackedWatch.prototype.fxResource = ['FX.Modifiers.ModifierMyAttackWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierMyAttackOrAttackedWatch;
