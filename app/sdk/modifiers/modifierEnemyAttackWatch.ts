/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const AttackAction = require('app/sdk/actions/attackAction');
const Modifier = require('./modifier');

class ModifierEnemyAttackWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;

  static type = 'ModifierEnemyAttackWatch';
  static modifierName = 'ModifierEnemyAttackWatch';
  static description = 'Whenever an enemy attacks...';

  onAction(event) {
    super.onAction(event);
    const { action } = event;
    const source = action.getSource();
    if (
      action instanceof AttackAction &&
      source.getOwner() !== this.getCard().getOwner() &&
      !action.getIsImplicit()
    ) {
      return this.onEnemyAttackWatch(action);
    }
  }

  onEnemyAttackWatch(action) {}
}
ModifierEnemyAttackWatch.prototype.type = 'ModifierEnemyAttackWatch';
ModifierEnemyAttackWatch.prototype.activeInHand = false;
ModifierEnemyAttackWatch.prototype.activeInDeck = false;
ModifierEnemyAttackWatch.prototype.activeInSignatureCards = false;
ModifierEnemyAttackWatch.prototype.activeOnBoard = true;
// override me in sub classes to implement special behavior

module.exports = ModifierEnemyAttackWatch;
