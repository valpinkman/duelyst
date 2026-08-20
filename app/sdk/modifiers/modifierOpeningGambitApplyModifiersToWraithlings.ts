/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const Cards = require('app/sdk/cards/cardsLookupComplete');
const ModifierOpeningGambitApplyModifiers = require('./modifierOpeningGambitApplyModifiers');

class ModifierOpeningGambitApplyModifiersToWraithlings extends ModifierOpeningGambitApplyModifiers {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitApplyModifiersToWraithlings';
  static description = '';

  static createContextObject(modifiersContextObjects, auraRadius, description, options) {
    const contextObject = super.createContextObject(
      modifiersContextObjects,
      false,
      false,
      true,
      false,
      false,
      auraRadius,
      description,
      options,
    );
    contextObject.cardId = Cards.Faction4.Wraithling;
    return contextObject;
  }

  getAffectedEntities(action) {
    const affectedEntities = [];
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const potentialAffectedEntities = super.getAffectedEntities(action);
      for (var entity of Array.from<any>(potentialAffectedEntities)) {
        if (entity.getBaseCardId() === this.cardId) {
          affectedEntities.push(entity);
        }
      }
    }
    return affectedEntities;
  }
}
ModifierOpeningGambitApplyModifiersToWraithlings.prototype.type =
  'ModifierOpeningGambitApplyModifiersToWraithlings';
ModifierOpeningGambitApplyModifiersToWraithlings.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
  'FX.Modifiers.ModifierGenericBuff',
];

module.exports = ModifierOpeningGambitApplyModifiersToWraithlings;
