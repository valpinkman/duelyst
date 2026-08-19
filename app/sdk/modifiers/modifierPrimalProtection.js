/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierPrimalProtection extends Modifier {
  static type = 'ModifierPrimalProtection';
  static isHiddenToUI = true;

  static createContextObject(options) {
    const contextObject = super.createContextObject(options);
    const modifiersContextObjects = [Modifier.createContextObject()];
    modifiersContextObjects[0].description = this.description;
    modifiersContextObjects[0].modifierName = this.modifierName;
    contextObject.activeInHand = false;
    contextObject.activeInDeck = false;
    contextObject.activeInSignatureCards = false;
    contextObject.activeOnBoard = true;
    contextObject.modifiersContextObjects = modifiersContextObjects;
    contextObject.isAura = true;
    contextObject.auraIncludeSelf = false;
    contextObject.auraIncludeAlly = true;
    contextObject.auraIncludeEnemy = false;
    contextObject.auraIncludeGeneral = false;
    contextObject.auraRadius = 0;
    return contextObject;
  }
}
ModifierPrimalProtection.prototype.type = 'ModifierPrimalProtection';
ModifierPrimalProtection.modifierName = i18next.t('modifiers.primal_protection_name');
ModifierPrimalProtection.description = i18next.t('modifiers.primal_protection_def');

module.exports = ModifierPrimalProtection;
