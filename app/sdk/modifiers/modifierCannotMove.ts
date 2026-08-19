/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const ModifierCannot = require('./modifierCannot');

class ModifierCannotMove extends ModifierCannot {
  declare type: any;
  declare attributeBuffs: any;
  declare attributeBuffsAbsolute: any;
  declare attributeBuffsFixed: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierCantMove';
}
ModifierCannotMove.prototype.type = 'ModifierCantMove';
ModifierCannotMove.modifierName = i18next.t('modifiers.faction_3_spell_sand_trap_1');
ModifierCannotMove.description = i18next.t('modifiers.faction_3_spell_sand_trap_1');
ModifierCannotMove.prototype.attributeBuffs = { speed: 0 };
ModifierCannotMove.prototype.attributeBuffsAbsolute = ['speed'];
ModifierCannotMove.prototype.attributeBuffsFixed = ['speed'];

module.exports = ModifierCannotMove;
