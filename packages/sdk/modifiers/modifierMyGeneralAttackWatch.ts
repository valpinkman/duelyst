/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const AttackAction = require('@duelyst/sdk/actions/attackAction');
const Modifier = require('./modifier');

class ModifierMyGeneralAttackWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;

  static type = 'ModifierMyGeneralAttackWatch';
  static modifierName = 'Attack Watch: My General';
  static description = 'Attack Watch: My General';

  onAction(event) {
    super.onAction(event);
    const { action } = event;
    const source = action.getSource();
    if (
      action instanceof AttackAction &&
      source.getOwner() === this.getCard().getOwner() &&
      source.getIsGeneral() &&
      !action.getIsImplicit()
    ) {
      return this.onMyGeneralAttackWatch(action);
    }
  }

  onMyGeneralAttackWatch(action) {}
}
ModifierMyGeneralAttackWatch.prototype.type = 'ModifierMyGeneralAttackWatch';
ModifierMyGeneralAttackWatch.prototype.activeInHand = false;
ModifierMyGeneralAttackWatch.prototype.activeInDeck = false;
ModifierMyGeneralAttackWatch.prototype.activeInSignatureCards = false;
ModifierMyGeneralAttackWatch.prototype.activeOnBoard = true;
// override me in sub classes to implement special behavior

module.exports = ModifierMyGeneralAttackWatch;
