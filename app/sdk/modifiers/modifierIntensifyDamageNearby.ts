/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const CardType = require('app/sdk/cards/cardType');
const ModifierIntensify = require('./modifierIntensify');

class ModifierIntensifyDamageNearby extends ModifierIntensify {
  declare type: any;
  declare fxResource: any;
  declare damageAmount: any;

  static type = 'ModifierIntensifyDamageNearby';

  static createContextObject(damageAmount, options) {
    const contextObject = super.createContextObject(options);
    contextObject.damageAmount = damageAmount;
    return contextObject;
  }

  onIntensify() {
    const totalDamageAmount = this.getIntensifyAmount() * this.damageAmount;

    const entities = this.getGameSession()
      .getBoard()
      .getEntitiesAroundEntity(this.getCard(), CardType.Unit, 1);
    return (() => {
      const result = [];
      for (var entity of Array.from<any>(entities)) {
        var damageAction = new DamageAction(this.getGameSession());
        damageAction.setOwnerId(this.getCard().getOwnerId());
        damageAction.setSource(this.getCard());
        damageAction.setTarget(entity);
        damageAction.setDamageAmount(totalDamageAmount);
        result.push(this.getGameSession().executeAction(damageAction));
      }
      return result;
    })();
  }
}
ModifierIntensifyDamageNearby.prototype.type = 'ModifierIntensifyDamageNearby';
ModifierIntensifyDamageNearby.prototype.fxResource = ['FX.Modifiers.ModifierGenericDamageNearby'];
ModifierIntensifyDamageNearby.prototype.damageAmount = 0;

module.exports = ModifierIntensifyDamageNearby;
