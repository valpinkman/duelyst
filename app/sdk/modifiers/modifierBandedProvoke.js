/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const ModifierBanded = require('./modifierBanded');
const ModifierProvoke = require('./modifierProvoke');

class ModifierBandedProvoke extends ModifierProvoke {
  static type = 'ModifierBandedProvoke';
}
ModifierBandedProvoke.prototype.type = 'ModifierBandedProvoke';

module.exports = ModifierBandedProvoke;
