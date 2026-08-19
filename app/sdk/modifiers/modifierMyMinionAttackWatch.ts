/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const AttackAction = require('app/sdk/actions/attackAction');
const Modifier = require('./modifier');

class ModifierMyMinionAttackWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierMyMinionAttackWatch';
  static modifierName = 'MyMinionAttackWatch';
  static description = 'Whenever you attack with a minion...';

  onAction(event) {
    super.onAction(event);
    const {
      action,
    } = event;
    const source = action.getSource();
    if (action instanceof AttackAction && (source.getOwner() === this.getCard().getOwner()) && !source.getIsGeneral() && !action.getIsImplicit()) {
      return this.onMyMinionAttackWatch(action);
    }
  }

  onMyMinionAttackWatch(action) {}
}
ModifierMyMinionAttackWatch.prototype.type = 'ModifierMyMinionAttackWatch';
ModifierMyMinionAttackWatch.prototype.activeInHand = false;
ModifierMyMinionAttackWatch.prototype.activeInDeck = false;
ModifierMyMinionAttackWatch.prototype.activeInSignatureCards = false;
ModifierMyMinionAttackWatch.prototype.activeOnBoard = true;
ModifierMyMinionAttackWatch.prototype.fxResource = ['FX.Modifiers.ModifierMyMinionAttackWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierMyMinionAttackWatch;
