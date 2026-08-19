/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const CardType = require('app/sdk/cards/cardType');
const ModifierTakeDamageWatch = require('./modifierTakeDamageWatch');

class ModifierTakeDamageWatchDamageNearbyEnemiesForSame extends ModifierTakeDamageWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierTakeDamageWatchDamageNearbyEnemiesForSame';
  static modifierName = 'Take Damage Watch Damage Enemy For Same';
  static description = 'Whenever this minion takes damage, deal that much damage to all nearby enemies';

  onDamageTaken(action) {
    const damageAmount = action.getTotalDamageAmount();
    // deal same damage taken to all enemies
    return (() => {
      const result = [];
      for (var unit of Array.from<any>(this.getGameSession().getBoard().getEnemyEntitiesAroundEntity(this.getCard(), CardType.Unit, 1))) {
        var damageAction = new DamageAction(this.getGameSession());
        damageAction.setOwnerId(this.getCard().getOwnerId());
        damageAction.setSource(this.getCard());
        damageAction.setTarget(unit);
        damageAction.setDamageAmount(damageAmount);
        result.push(this.getGameSession().executeAction(damageAction));
      }
      return result;
    })();
  }
}
ModifierTakeDamageWatchDamageNearbyEnemiesForSame.prototype.type = 'ModifierTakeDamageWatchDamageNearbyEnemiesForSame';
ModifierTakeDamageWatchDamageNearbyEnemiesForSame.prototype.fxResource = ['FX.Modifiers.ModifierTakeDamageWatch', 'FX.Modifiers.ModifierGenericDamage'];

module.exports = ModifierTakeDamageWatchDamageNearbyEnemiesForSame;
