/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const KillAction = require('app/sdk/actions/killAction');
const CardType = require('app/sdk/cards/cardType');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitDestroyNearbyMinions extends ModifierOpeningGambit {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitDestroyNearbyMinions';
  static modifierName = 'Opening Gambit';
  static description = 'Destroy %X';

  static createContextObject(includeAllies, options) {
    if (includeAllies == null) {
      includeAllies = true;
    }
    const contextObject = super.createContextObject();
    contextObject.includeAllies = includeAllies;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      let replaceText;
      if (modifierContextObject.includeAllies) {
        replaceText = ' ALL nearby minions';
      } else {
        replaceText = ' all nearby enemy minions';
      }
      return this.description.replace(/%X/, replaceText);
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
          // this ability only kills minions, not Generals
          var killAction = new KillAction(this.getGameSession());
          killAction.setOwnerId(this.getCard().getOwnerId());
          killAction.setSource(this.getCard());
          killAction.setTarget(entity);
          result.push(this.getGameSession().executeAction(killAction));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
}
ModifierOpeningGambitDestroyNearbyMinions.prototype.type =
  'ModifierOpeningGambitDestroyNearbyMinions';
ModifierOpeningGambitDestroyNearbyMinions.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
  'FX.Modifiers.ModifierGenericChainLightningRed',
];

module.exports = ModifierOpeningGambitDestroyNearbyMinions;
