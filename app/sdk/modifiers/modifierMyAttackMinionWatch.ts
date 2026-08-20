/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const AttackAction = require('app/sdk/actions/attackAction');
const CardType = require('app/sdk/cards/cardType');
const Modifier = require('./modifier');

class ModifierMyAttackMinionWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierMyAttackMinionWatch';

  onAction(event) {
    super.onAction(event);
    const { action } = event;
    if (
      action instanceof AttackAction &&
      action.getSource() === this.getCard() &&
      (!action.getIsImplicit() || action.getIsAutomatic()) &&
      !action.getTarget().getIsGeneral()
    ) {
      return this.onMyAttackMinionWatch(action);
    }
  }

  onMyAttackMinionWatch(action) {}
}
ModifierMyAttackMinionWatch.prototype.type = 'ModifierMyAttackMinionWatch';
ModifierMyAttackMinionWatch.prototype.activeInHand = false;
ModifierMyAttackMinionWatch.prototype.activeInDeck = false;
ModifierMyAttackMinionWatch.prototype.activeInSignatureCards = false;
ModifierMyAttackMinionWatch.prototype.activeOnBoard = true;
ModifierMyAttackMinionWatch.prototype.fxResource = ['FX.Modifiers.ModifierMyAttackWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierMyAttackMinionWatch;
