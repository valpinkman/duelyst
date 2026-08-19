/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const DamageAction = require('app/sdk/actions/damageAction');
const CardType = require('app/sdk/cards/cardType');
const ModifierMyGeneralDamagedWatch = require('./modifierMyGeneralDamagedWatch');

class ModifierMyGeneralDamagedWatchDamageNearby extends ModifierMyGeneralDamagedWatch {
  static type = 'ModifierMyGeneralDamagedWatchDamageNearby';
  static modifierName = 'My General Damage Watch Damage Nearby';
  static description = 'Whenever your General takes damage, deal %X damage to %Y';

  static createContextObject(damageAmount, includeAllies, options) {
    if (includeAllies == null) { includeAllies = false; }
    const contextObject = super.createContextObject(options);
    contextObject.damageAmount = damageAmount;
    contextObject.includeAllies = includeAllies;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      let replaceText = this.description.replace(/%X/, modifierContextObject.damageAmount);
      if (modifierContextObject.includeAllies) {
        replaceText = replaceText.replace(/%Y/, 'a random nearby minion');
      } else {
        replaceText = replaceText.replace(/%Y/, 'a random nearby enemy minion');
      }
      return replaceText;
    }
    return this.description;
  }

  onDamageDealtToGeneral(action) {
    super.onDamageDealtToGeneral(action);

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      let entities;
      if (this.includeAllies) {
        entities = this.getGameSession().getBoard().getEntitiesAroundEntity(this.getCard(), CardType.Unit, 1);
      } else {
        entities = this.getGameSession().getBoard().getEnemyEntitiesAroundEntity(this.getCard(), CardType.Unit, 1);
      }

      // don't damage the Generals with this counter-attack
      const validEntities = [];
      for (var entity of Array.from(entities)) {
        if (!entity.getIsGeneral()) {
          validEntities.push(entity);
        }
      }

      if (validEntities.length > 0) {
        const unitToDamage = validEntities[this.getGameSession().getRandomIntegerForExecution(validEntities.length)];
        const damageAction = new DamageAction(this.getGameSession());
        damageAction.setOwnerId(this.getCard().getOwnerId());
        damageAction.setSource(this.getCard());
        damageAction.setTarget(unitToDamage);
        damageAction.setDamageAmount(this.damageAmount);
        return this.getGameSession().executeAction(damageAction);
      }
    }
  }
}
ModifierMyGeneralDamagedWatchDamageNearby.prototype.type = 'ModifierMyGeneralDamagedWatchDamageNearby';
ModifierMyGeneralDamagedWatchDamageNearby.prototype.damageAmount = 0;
ModifierMyGeneralDamagedWatchDamageNearby.prototype.includeAllies = false;
ModifierMyGeneralDamagedWatchDamageNearby.prototype.fxResource = ['FX.Modifiers.ModifierMyGeneralDamagedWatch', 'FX.Modifiers.ModifierGenericDamageNearby'];

module.exports = ModifierMyGeneralDamagedWatchDamageNearby;
