/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const Races = require('app/sdk/cards/racesLookup');
const ModifierBelongsToAllRaces = require('app/sdk/modifiers/modifierBelongsToAllRaces');
const Modifier = require('./modifier');

class ModifierFeralu extends Modifier {
  declare type: any;

  static type = 'ModifierFeralu';
  static modifierName = 'Feralu';
  static description = '';

  _filterPotentialCardInAura(card) {
    return ((card.getRaceId() !== Races.Neutral) || card.hasModifierClass(ModifierBelongsToAllRaces)) && super._filterPotentialCardInAura(card);
  }
}
ModifierFeralu.prototype.type = 'ModifierFeralu';

module.exports = ModifierFeralu;
