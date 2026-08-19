/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const i18next = require('i18next');
const ModifierBanding = require('./modifierBanding');
const ModifierEndTurnWatchHealSelfAndGeneral = require('./modifierEndTurnWatchHealSelfAndGeneral');

class ModifierBandingHealSelfAndGeneral extends ModifierBanding {
  static type = 'ModifierBandingHealSelfAndGeneral';
  static description = '';

  static createContextObject(healAmount, options) {
    if (healAmount == null) { healAmount = 0; }
    const contextObject = super.createContextObject(options);
    contextObject.appliedName = i18next.t('modifiers.banding_heal_self_and_general_name');
    contextObject.healAmount = healAmount;
    const bandedContextObject = ModifierEndTurnWatchHealSelfAndGeneral.createContextObject(healAmount);
    bandedContextObject.appliedName = i18next.t('modifiers.banding_heal_self_and_general_name');
    contextObject.modifiersContextObjects = [bandedContextObject];
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/, modifierContextObject.healAmount);
    }
    return this.description;
  }
}
ModifierBandingHealSelfAndGeneral.prototype.type = 'ModifierBandingHealSelfAndGeneral';
ModifierBandingHealSelfAndGeneral.prototype.fxResource = ['FX.Modifiers.ModifierZeal', 'FX.Modifiers.ModifierZealHeal'];

module.exports = ModifierBandingHealSelfAndGeneral;
