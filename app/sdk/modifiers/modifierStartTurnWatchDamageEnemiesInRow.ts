/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const ModifierStartTurnWatch = require('./modifierStartTurnWatch');

class ModifierStartTurnWatchDamageEnemiesInRow extends ModifierStartTurnWatch {
  declare type: any;
  declare damageAmount: any;
  declare damageGeneral: any;
  declare fxResource: any;

  static type = 'ModifierStartTurnWatchDamageEnemiesInRow';
  static modifierName = 'Start Watch';
  static description = 'At the start of your turn, deal %X damage to enemies in row';

  static createContextObject(damageAmount, damageGeneral, options) {
    if (damageAmount == null) {
      damageAmount = 0;
    }
    if (damageGeneral == null) {
      damageGeneral = false;
    }
    const contextObject = super.createContextObject(options);
    contextObject.damageAmount = damageAmount;
    contextObject.damageGenerals = damageGeneral;
    return contextObject;
  }

  onTurnWatch(action) {
    let damageAction;
    let previousOffset;
    let target;
    const board = this.getCard().getGameSession().getBoard();

    let offset = 1;
    let offsetPosition = {
      x: this.getCard().getPosition().x + offset,
      y: this.getCard().getPosition().y,
    };
    while (board.isOnBoard(offsetPosition)) {
      target = board.getUnitAtPosition(offsetPosition);
      if (target != null && target.getOwner() !== this.getCard().getOwner()) {
        // damage any enemy found
        if (this.damageGeneral || !target.getIsGeneral()) {
          damageAction = new DamageAction(this.getCard().getGameSession());
          damageAction.setOwnerId(this.getCard().getOwnerId());
          damageAction.setTarget(target);
          damageAction.setDamageAmount(this.damageAmount);
          this.getGameSession().executeAction(damageAction);
        }
      }
      previousOffset = offsetPosition;
      offsetPosition = { x: previousOffset.x + offset, y: previousOffset.y };
    }

    offset = -1;
    offsetPosition = {
      x: this.getCard().getPosition().x + offset,
      y: this.getCard().getPosition().y,
    };
    return (() => {
      const result = [];
      while (board.isOnBoard(offsetPosition)) {
        target = board.getUnitAtPosition(offsetPosition);
        if (target != null && target.getOwner() !== this.getCard().getOwner()) {
          // damage any enemy found
          if (this.damageGeneral || !target.getIsGeneral()) {
            damageAction = new DamageAction(this.getCard().getGameSession());
            damageAction.setOwnerId(this.getCard().getOwnerId());
            damageAction.setTarget(target);
            damageAction.setDamageAmount(this.damageAmount);
            this.getGameSession().executeAction(damageAction);
          }
        }
        previousOffset = offsetPosition;
        result.push((offsetPosition = { x: previousOffset.x + offset, y: previousOffset.y }));
      }
      return result;
    })();
  }
}
ModifierStartTurnWatchDamageEnemiesInRow.prototype.type =
  'ModifierStartTurnWatchDamageEnemiesInRow';
ModifierStartTurnWatchDamageEnemiesInRow.prototype.damageAmount = 0;
ModifierStartTurnWatchDamageEnemiesInRow.prototype.damageGeneral = false;
ModifierStartTurnWatchDamageEnemiesInRow.prototype.fxResource = [
  'FX.Modifiers.ModifierStartTurnWatch',
  'FX.Modifiers.ModifierGenericDamageFire',
];

module.exports = ModifierStartTurnWatchDamageEnemiesInRow;
