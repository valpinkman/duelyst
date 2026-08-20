/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const AttackAction = require('app/sdk/actions/attackAction');
const Modifier = require('./modifier');

class ModifierEnemyGeneralAttackWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierEnemyGeneralAttackWatch';
  static modifierName = 'ModifierEnemyGeneralAttackWatch';
  static description = 'Whenever the enemy General attacks...';

  onAction(event) {
    super.onAction(event);
    const { action } = event;
    const source = action.getSource();
    if (
      action instanceof AttackAction &&
      source.getOwner() !== this.getCard().getOwner() &&
      source.getIsGeneral() &&
      !action.getIsImplicit()
    ) {
      return this.onEnemyGeneralAttackWatch(action);
    }
  }

  onEnemyGeneralAttackWatch(action) {}
}
ModifierEnemyGeneralAttackWatch.prototype.type = 'ModifierEnemyGeneralAttackWatch';
ModifierEnemyGeneralAttackWatch.prototype.activeInHand = false;
ModifierEnemyGeneralAttackWatch.prototype.activeInDeck = false;
ModifierEnemyGeneralAttackWatch.prototype.activeInSignatureCards = false;
ModifierEnemyGeneralAttackWatch.prototype.activeOnBoard = true;
ModifierEnemyGeneralAttackWatch.prototype.fxResource = [
  'FX.Modifiers.ModifierEnemyMinionAttackWatch',
];
// override me in sub classes to implement special behavior

module.exports = ModifierEnemyGeneralAttackWatch;
