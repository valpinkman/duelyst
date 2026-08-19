/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const ModifierBanded = require('./modifierBanded');
const ModifierFlying = require('./modifierFlying');

class ModifierBandedFlying extends ModifierFlying {
  static type = 'ModifierBandedFlying';
}
ModifierBandedFlying.prototype.type = 'ModifierBandedFlying';
ModifierBandedFlying.prototype.fxResource = ['FX.Modifiers.ModifierZealed'];

module.exports = ModifierBandedFlying;
