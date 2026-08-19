/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierBelongsToAllRaces extends Modifier {
  declare type: any;
  declare fxResource: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierBelongsToAllRaces';
}
ModifierBelongsToAllRaces.prototype.type = 'ModifierBelongsToAllRaces';
ModifierBelongsToAllRaces.modifierName = i18next.t('modifiers.belongs_to_all_races_name');
ModifierBelongsToAllRaces.description = i18next.t('modifiers.belongs_to_all_races_def');
ModifierBelongsToAllRaces.prototype.fxResource = ['FX.Modifiers.ModifierBelongsToAllRaces'];

module.exports = ModifierBelongsToAllRaces;
