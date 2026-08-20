/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Stringifiers = require('app/sdk/helpers/stringifiers');
const i18next = require('i18next');
const ModifierBanding = require('./modifierBanding');
const ModifierBanded = require('./modifierBanded');

class ModifierBandingAttack extends ModifierBanding {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierBandingAttack';

  static createContextObject(attackBuff, options) {
    if (attackBuff == null) {
      attackBuff = 0;
    }
    if (options == null) {
      options = undefined;
    }
    const contextObject = super.createContextObject(options);
    contextObject.appliedName = i18next.t('modifiers.banding_attack_applied_name');
    const attackBuffContextObject = ModifierBanded.createContextObject(attackBuff);
    attackBuffContextObject.appliedName = i18next.t('modifiers.banded_attack_applied_name');
    contextObject.modifiersContextObjects = [attackBuffContextObject];
    return contextObject;
  }
}
ModifierBandingAttack.prototype.type = 'ModifierBandingAttack';
ModifierBandingAttack.prototype.fxResource = [
  'FX.Modifiers.ModifierZeal',
  'FX.Modifiers.ModifierZealAttack',
];

module.exports = ModifierBandingAttack;
