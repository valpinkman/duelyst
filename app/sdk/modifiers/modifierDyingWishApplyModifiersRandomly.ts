/*
 * decaffeinate suggestions:
 * DS202: Simplify dynamic range loops
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const ModifierDyingWishApplyModifiers = require('./modifierDyingWishApplyModifiers');

class ModifierDyingWishApplyModifiersRandomly extends ModifierDyingWishApplyModifiers {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierDyingWishApplyModifiersRandomly';

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
      auraIncludeSelf,
      auraIncludeAlly,
      auraIncludeEnemy,
      auraRadius,
      auraIncludeGeneral,
      description,
      options,
    );
    contextObject.numberOfApplications = numberOfApplications;
    return contextObject;
  }

  getAffectedEntities(action?) {
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
ModifierDyingWishApplyModifiersRandomly.prototype.type = 'ModifierDyingWishApplyModifiersRandomly';
ModifierDyingWishApplyModifiersRandomly.prototype.fxResource = [
  'FX.Modifiers.ModifierDyingWish',
  'FX.Modifiers.ModifierGenericBuff',
];

module.exports = ModifierDyingWishApplyModifiersRandomly;
