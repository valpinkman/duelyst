/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('@duelyst/common/config');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const ModifierOpeningGambit = require('./modifierOpeningGambit');
const Modifier = require('./modifier');

class ModifierOpeningGambitDamageNearbyMinions extends ModifierOpeningGambit {
  declare type: any;
  declare damageAmount: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitDamageNearbyMinions';
  static modifierName = 'Opening Gambit';
  static description = 'Deal %X damage to';

  static createContextObject(damageAmount, includeAllies, options) {
    if (includeAllies == null) {
      includeAllies = true;
    }
    const contextObject = super.createContextObject();
    contextObject.damageAmount = damageAmount;
    contextObject.includeAllies = includeAllies;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      let replaceText = this.description;
      if (modifierContextObject.includeAllies) {
        replaceText += ' ALL minions around it';
      } else {
        replaceText += ' all enemy minions around it';
      }
      return replaceText.replace(/%X/, modifierContextObject.damageAmount);
    }
    return this.description;
  }

  onOpeningGambit() {
    let entities;
    if (this.includeAllies) {
      entities = this.getGameSession()
        .getBoard()
        .getEntitiesAroundEntity(this.getCard(), CardType.Unit, 1);
    } else {
      entities = this.getGameSession()
        .getBoard()
        .getEnemyEntitiesAroundEntity(this.getCard(), CardType.Unit, 1);
    }

    return (() => {
      const result = [];
      for (var entity of Array.from<any>(entities)) {
        if (!entity.getIsGeneral()) {
          // this ability only damages minions, not Generals
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
ModifierOpeningGambitDamageNearbyMinions.prototype.type =
  'ModifierOpeningGambitDamageNearbyMinions';
ModifierOpeningGambitDamageNearbyMinions.prototype.damageAmount = 0;
ModifierOpeningGambitDamageNearbyMinions.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
  'FX.Modifiers.ModifierGenericChainLightningRed',
];

module.exports = ModifierOpeningGambitDamageNearbyMinions;
