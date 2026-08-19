/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Stringifiers = require('app/sdk/helpers/stringifiers');
const ModifierBanding = require('./modifierBanding');
const ModifierBanded = require('./modifierBanded');

class ModifierBandingAttackAndHealth extends ModifierBanding {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierBandingAttackAndHealth';
  static description = 'Gains %X / %Y';

  static createContextObject(attackBuff, healthBuff, options) {
    if (attackBuff == null) { attackBuff = 0; }
    if (healthBuff == null) { healthBuff = 0; }
    if (options == null) { options = undefined; }
    const contextObject = super.createContextObject(options);
    contextObject.appliedName = 'Zeal: Lion\'s Fortitude';
    const buffContextObject = ModifierBanded.createContextObject(attackBuff, healthBuff);
    buffContextObject.appliedName = 'Zealed: Lion\'s Fortitude';
    contextObject.modifiersContextObjects = [buffContextObject];
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      const subContextObject = modifierContextObject.modifiersContextObjects[0];
      let replaceText = this.description.replace(/%X/, Stringifiers.stringifyStatBuff(subContextObject.attributeBuffs.atk));
      return replaceText = replaceText.replace(/%Y/, Stringifiers.stringifyStatBuff(subContextObject.attributeBuffs.maxHP));
    }
    return this.description;
  }
}
ModifierBandingAttackAndHealth.prototype.type = 'ModifierBandingAttackAndHealth';
ModifierBandingAttackAndHealth.prototype.fxResource = ['FX.Modifiers.ModifierZeal', 'FX.Modifiers.ModifierZealAttackAndHealth'];

module.exports = ModifierBandingAttackAndHealth;
