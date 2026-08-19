/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierStackingShadowsDebuff extends Modifier {
  static type = 'ModifierStackingShadowsDebuff';
  static isHiddenToUI = true;

  static createContextObject(options) {
    const contextObject = super.createContextObject(options);
    const modifiersContextObjects = [Modifier.createContextObject()];
    modifiersContextObjects[0].description = i18next.t('modifiers.stacking_shadows_debuff_def');
    modifiersContextObjects[0].modifierName = i18next.t('modifiers.stacking_shadows_debuff_name');
    contextObject.activeInHand = false;
    contextObject.activeInDeck = false;
    contextObject.activeInSignatureCards = false;
    contextObject.activeOnBoard = true;
    contextObject.modifiersContextObjects = modifiersContextObjects;
    contextObject.isAura = true;
    contextObject.auraIncludeSelf = false;
    contextObject.auraIncludeAlly = false;
    contextObject.auraIncludeEnemy = true;
    contextObject.auraIncludeGeneral = true;
    contextObject.auraRadius = 0;
    return contextObject;
  }
}
ModifierStackingShadowsDebuff.prototype.type = 'ModifierStackingShadowsDebuff';
ModifierStackingShadowsDebuff.modifierName = i18next.t('modifiers.stacking_shadows_debuff_name');
ModifierStackingShadowsDebuff.description = i18next.t('modifiers.stacking_shadows_debuff_def');

module.exports = ModifierStackingShadowsDebuff;
