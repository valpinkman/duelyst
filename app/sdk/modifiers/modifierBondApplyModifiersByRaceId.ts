/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const ModifierBondAplyModifiers = require('./modifierBondApplyModifiers');

class ModifierBondApplyModifiersByRaceId extends ModifierBondAplyModifiers {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierBondApplyModifiersByRaceId';
  static description = '';

  static createContextObject(
    modifiersContextObjects,
    managedByCard,
    auraIncludeSelf,
    auraIncludeAlly,
    auraIncludeEnemy,
    auraIncludeGeneral,
    auraRadius,
    raceId,
    description,
    options,
  ) {
    const contextObject = super.createContextObject(
      modifiersContextObjects,
      managedByCard,
      auraIncludeSelf,
      auraIncludeAlly,
      auraIncludeEnemy,
      auraIncludeGeneral,
      auraRadius,
      description,
      options,
    );
    contextObject.raceId = raceId;
    return contextObject;
  }

  getAffectedEntities(action?) {
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
ModifierBondApplyModifiersByRaceId.prototype.type = 'ModifierBondApplyModifiersByRaceId';
ModifierBondApplyModifiersByRaceId.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
  'FX.Modifiers.ModifierGenericBuff',
];

module.exports = ModifierBondApplyModifiersByRaceId;
