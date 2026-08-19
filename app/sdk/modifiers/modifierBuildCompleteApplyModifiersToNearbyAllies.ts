/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const ModifierBuilding = require('./modifierBuilding');

class ModifierBuildCompleteApplyModifiersToNearbyAllies extends ModifierBuilding {
  declare type: any;
  declare modifiers: any;
  declare includeGeneral: any;

  static type = 'ModifierBuildCompleteApplyModifiersToNearbyAllies';

  static createContextObject(modifiers, includeGeneral, description, transformCardData, turnsToBuild, options) {
    const contextObject = super.createContextObject(description, transformCardData, turnsToBuild, options);
    contextObject.modifiers = modifiers;
    contextObject.includeGeneral = includeGeneral;
    return contextObject;
  }

  onBuildComplete() {
    super.onBuildComplete();

    const allies = this.getGameSession().getBoard().getFriendlyEntitiesAroundEntity(this.getCard(), CardType.Unit, 1);
    if ((allies != null) && (this.modifiers != null)) {
      return (() => {
        const result = [];
        for (var entity of Array.from<any>(allies)) {
          if ((entity != null) && (this.includeGeneral || !entity.getIsGeneral())) {
            result.push(Array.from<any>(this.modifiers).map((modifier) =>
              this.getGameSession().applyModifierContextObject(modifier, entity)));
          } else {
            result.push(undefined);
          }
        }
        return result;
      })();
    }
  }
}
ModifierBuildCompleteApplyModifiersToNearbyAllies.prototype.type = 'ModifierBuildCompleteApplyModifiersToNearbyAllies';
ModifierBuildCompleteApplyModifiersToNearbyAllies.prototype.modifiers = null;
ModifierBuildCompleteApplyModifiersToNearbyAllies.prototype.includeGeneral = false;

module.exports = ModifierBuildCompleteApplyModifiersToNearbyAllies;
