/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const AttackAction = require('app/sdk/actions/attackAction');
const Modifier = require('./modifier');

class ModifierEnemyMinionAttackWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierEnemyMinionAttackWatch';
  static modifierName = 'ModifierEnemyMinionAttackWatch';
  static description = 'Whenever an enemy minion attacks...';

  onAction(event) {
    super.onAction(event);
    const {
      action,
    } = event;
    const source = action.getSource();
    if (action instanceof AttackAction && (source.getOwner() !== this.getCard().getOwner()) && !source.getIsGeneral() && !action.getIsImplicit()) {
      return this.onEnemyMinionAttackWatch(action);
    }
  }

  onEnemyMinionAttackWatch(action) {}
}
ModifierEnemyMinionAttackWatch.prototype.type = 'ModifierEnemyMinionAttackWatch';
ModifierEnemyMinionAttackWatch.prototype.activeInHand = false;
ModifierEnemyMinionAttackWatch.prototype.activeInDeck = false;
ModifierEnemyMinionAttackWatch.prototype.activeInSignatureCards = false;
ModifierEnemyMinionAttackWatch.prototype.activeOnBoard = true;
ModifierEnemyMinionAttackWatch.prototype.fxResource = ['FX.Modifiers.ModifierEnemyMinionAttackWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierEnemyMinionAttackWatch;
