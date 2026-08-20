/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const CONFIG = require('app/common/config');
const CardType = require('app/sdk/cards/cardType');
const ModifierTakeDamageWatch = require('./modifierTakeDamageWatch');

class ModifierTakeDamageWatchDamageAllEnemies extends ModifierTakeDamageWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierTakeDamageWatchDamageAllEnemies';
  static modifierName = 'Take Damage Watch';
  static description = 'Whenever this minion takes damage, deal %X damage to all enemies';

  static createContextObject(damageAmount, options) {
    const contextObject = super.createContextObject(options);
    contextObject.damageAmount = damageAmount;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/, modifierContextObject.damageAmount);
    }
    return this.description;
  }

  onDamageTaken(action) {
    return (() => {
      const result = [];
      for (var enemyMinion of Array.from<any>(
        this.getGameSession().getBoard().getEnemyEntitiesForEntity(this.getCard(), CardType.Unit),
      )) {
        var damageAction = new DamageAction(this.getGameSession());
        damageAction.setOwnerId(this.getCard().getOwnerId());
        damageAction.setSource(this.getCard());
        damageAction.setTarget(enemyMinion);
        damageAction.setDamageAmount(this.damageAmount);
        result.push(this.getGameSession().executeAction(damageAction));
      }
      return result;
    })();
  }
}
ModifierTakeDamageWatchDamageAllEnemies.prototype.type = 'ModifierTakeDamageWatchDamageAllEnemies';
ModifierTakeDamageWatchDamageAllEnemies.prototype.fxResource = [
  'FX.Modifiers.ModifierTakeDamageWatch',
  'FX.Modifiers.ModifierGenericDamage',
];

module.exports = ModifierTakeDamageWatchDamageAllEnemies;
