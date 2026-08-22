/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('@duelyst/common/config');
const Races = require('@duelyst/sdk/cards/racesLookup');
const ModifierBelongsToAllRaces = require('@duelyst/sdk/modifiers/modifierBelongsToAllRaces');
const Modifier = require('./modifier');

class ModifierFeralu extends Modifier {
  declare type: any;

  static type = 'ModifierFeralu';
  static modifierName = 'Feralu';
  static description = '';

  _filterPotentialCardInAura(card) {
    return (
      (card.getRaceId() !== Races.Neutral || card.hasModifierClass(ModifierBelongsToAllRaces)) &&
      super._filterPotentialCardInAura(card)
    );
  }
}
ModifierFeralu.prototype.type = 'ModifierFeralu';

module.exports = ModifierFeralu;
