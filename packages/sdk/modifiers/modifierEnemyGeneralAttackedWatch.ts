/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const AttackAction = require('@duelyst/sdk/actions/attackAction');
const Modifier = require('./modifier');

class ModifierEnemyGeneralAttackedWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierEnemyGeneralAttackedWatch';

  onAction(event) {
    super.onAction(event);
    const { action } = event;
    const source = action.getSource();
    if (
      action instanceof AttackAction &&
      action.getTarget().getOwner() !== this.getCard().getOwner() &&
      action.getTarget().getIsGeneral() &&
      !action.getIsImplicit()
    ) {
      return this.onEnemyGeneralAttackedWatch(action);
    }
  }

  onEnemyGeneralAttackedWatch(action) {}
}
ModifierEnemyGeneralAttackedWatch.prototype.type = 'ModifierEnemyGeneralAttackedWatch';
ModifierEnemyGeneralAttackedWatch.prototype.activeInHand = true;
ModifierEnemyGeneralAttackedWatch.prototype.activeInDeck = false;
ModifierEnemyGeneralAttackedWatch.prototype.activeInSignatureCards = false;
ModifierEnemyGeneralAttackedWatch.prototype.activeOnBoard = false;
ModifierEnemyGeneralAttackedWatch.prototype.fxResource = [
  'FX.Modifiers.ModifierEnemyMinionAttackWatch',
];
// override me in sub classes to implement special behavior

module.exports = ModifierEnemyGeneralAttackedWatch;
