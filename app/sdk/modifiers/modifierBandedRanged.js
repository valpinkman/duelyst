/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const i18next = require('i18next');
const ModifierBanded = require('./modifierBanded');
const ModifierRanged = require('./modifierRanged');

class ModifierBandedRanged extends ModifierRanged {
  static type = 'ModifierBandedRanged';
}
ModifierBandedRanged.prototype.type = 'ModifierBandedRanged';
ModifierBandedRanged.modifierName = i18next.t('modifiers.banded_ranged_name');
ModifierBandedRanged.description = i18next.t('modifiers.banded_ranged_def');
ModifierBandedRanged.prototype.fxResource = ['FX.Modifiers.ModifierZealed', 'FX.Modifiers.ModifierZealedRanged'];

module.exports = ModifierBandedRanged;
