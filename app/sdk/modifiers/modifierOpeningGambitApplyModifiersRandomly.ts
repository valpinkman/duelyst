/*
 * decaffeinate suggestions:
 * DS202: Simplify dynamic range loops
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const ModifierOpeningGambitApplyModifiers = require('./modifierOpeningGambitApplyModifiers');

class ModifierOpeningGambitApplyModifiersRandomly extends ModifierOpeningGambitApplyModifiers {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitApplyModifiersRandomly';
  static description = 'Nearby friendly minions gain %X';

  static createContextObject(
    modifiersContextObjects,
    managedByCard,
    auraIncludeSelf,
    auraIncludeAlly,
    auraIncludeEnemy,
    auraIncludeGeneral,
    auraRadius,
    numberOfApplications,
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
    contextObject.numberOfApplications = numberOfApplications;
    return contextObject;
  }

  getAffectedEntities(action) {
    const affectedEntities = [];
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const potentialAffectedEntities = super.getAffectedEntities(action);
      for (
        let i = 0, end = this.numberOfApplications, asc = end >= 0;
        asc ? i < end : i > end;
        asc ? i++ : i--
      ) {
        if (potentialAffectedEntities.length > 0) {
          affectedEntities.push(
            potentialAffectedEntities.splice(
              this.getGameSession().getRandomIntegerForExecution(potentialAffectedEntities.length),
              1,
            )[0],
          );
        }
      }
    }
    return affectedEntities;
  }
}
ModifierOpeningGambitApplyModifiersRandomly.prototype.type =
  'ModifierOpeningGambitApplyModifiersRandomly';
ModifierOpeningGambitApplyModifiersRandomly.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
  'FX.Modifiers.ModifierGenericBuff',
];

module.exports = ModifierOpeningGambitApplyModifiersRandomly;
