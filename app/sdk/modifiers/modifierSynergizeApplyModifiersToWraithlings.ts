/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const Cards = require('app/sdk/cards/cardsLookupComplete');
const ModifierSynergizeApplyModifiers = require('./modifierSynergizeApplyModifiers');

class ModifierSynergizeApplyModifiersToWraithlings extends ModifierSynergizeApplyModifiers {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierSynergizeApplyModifiersToWraithlings';
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

  getAffectedEntities(action?) {
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
ModifierSynergizeApplyModifiersToWraithlings.prototype.type =
  'ModifierSynergizeApplyModifiersToWraithlings';
ModifierSynergizeApplyModifiersToWraithlings.prototype.fxResource = [
  'FX.Modifiers.ModifierSynergize',
  'FX.Modifiers.ModifierGenericBuff',
];

module.exports = ModifierSynergizeApplyModifiersToWraithlings;
