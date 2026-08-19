/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const ModifierOpeningGambitApplyModifiers = require('./modifierOpeningGambitApplyModifiers');

class ModifierOpeningGambitApplyModifiersByRaceId extends ModifierOpeningGambitApplyModifiers {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitApplyModifiersByRaceId';
  static description = '';

  static createContextObject(modifiersContextObjects, managedByCard, auraIncludeSelf, auraIncludeAlly, auraIncludeEnemy, auraIncludeGeneral, auraRadius, raceId, description, options) {
    const contextObject = super.createContextObject(modifiersContextObjects, managedByCard, auraIncludeSelf, auraIncludeAlly, auraIncludeEnemy, auraIncludeGeneral, auraRadius, description, options);
    contextObject.raceId = raceId;
    return contextObject;
  }

  getAffectedEntities(action) {
    const affectedEntities = [];
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const potentialAffectedEntities = super.getAffectedEntities(action);
      for (var entity of Array.from<any>(potentialAffectedEntities)) {
        if (entity.getBelongsToTribe(this.raceId)) {
          affectedEntities.push(entity);
        }
      }
    }
    return affectedEntities;
  }
}
ModifierOpeningGambitApplyModifiersByRaceId.prototype.type = 'ModifierOpeningGambitApplyModifiersByRaceId';
ModifierOpeningGambitApplyModifiersByRaceId.prototype.fxResource = ['FX.Modifiers.ModifierOpeningGambit', 'FX.Modifiers.ModifierGenericBuff'];

module.exports = ModifierOpeningGambitApplyModifiersByRaceId;
