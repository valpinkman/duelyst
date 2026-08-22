/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const CONFIG = require('@duelyst/common/config');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const ModifierEndTurnWatch = require('./modifierEndTurnWatch');

class ModifierEndTurnWatchDamageAllMinions extends ModifierEndTurnWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierEndTurnWatchDamageAllMinions';
  static modifierName = 'Turn Watch';
  static description = 'At the end of your turn, deal %X damage to ALL other minions';

  static createContextObject(damageAmount, auraRadius, options) {
    if (damageAmount == null) {
      damageAmount = 0;
    }
    if (auraRadius == null) {
      auraRadius = CONFIG.WHOLE_BOARD_RADIUS;
    }
    const contextObject = super.createContextObject(options);
    contextObject.damageAmount = damageAmount;
    contextObject.auraRadius = auraRadius;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      const replaceText = this.description.replace(/%X/, modifierContextObject.damageAmount);

      return replaceText;
    }
    return this.description;
  }

  onTurnWatch(action) {
    super.onTurnWatch(action);

    const entities = this.getGameSession()
      .getBoard()
      .getEntitiesAroundEntity(this.getCard(), CardType.Unit, this.auraRadius);
    return (() => {
      const result = [];
      for (var entity of Array.from<any>(entities)) {
        if (!entity.getIsGeneral()) {
          var damageAction = new DamageAction(this.getGameSession());
          damageAction.setOwnerId(this.getCard().getOwnerId());
          damageAction.setSource(this.getCard());
          damageAction.setTarget(entity);
          damageAction.setDamageAmount(this.damageAmount);
          result.push(this.getGameSession().executeAction(damageAction));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
}
ModifierEndTurnWatchDamageAllMinions.prototype.type = 'ModifierEndTurnWatchDamageAllMinions';
ModifierEndTurnWatchDamageAllMinions.prototype.fxResource = [
  'FX.Modifiers.ModifierEndTurnWatch',
  'FX.Modifiers.ModifierGenericChainLightning',
];

module.exports = ModifierEndTurnWatchDamageAllMinions;
