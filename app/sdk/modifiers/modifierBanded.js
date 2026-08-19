/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierBanded extends Modifier {
  static type = 'ModifierBanded';

  static createContextObject(attack, maxHP, options) {
    if (attack == null) { attack = 0; }
    if (maxHP == null) { maxHP = 0; }
    if (options == null) { options = undefined; }
    const contextObject = super.createContextObject(options);
    contextObject.attributeBuffs = Modifier.createAttributeBuffsObject(attack, maxHP);
    return contextObject;
  }
}
ModifierBanded.prototype.type = 'ModifierBanded';
ModifierBanded.modifierName = i18next.t('modifiers.banded_name');
ModifierBanded.description = i18next.t('modifiers.banded_def');
ModifierBanded.prototype.activeInHand = false;
ModifierBanded.prototype.activeInDeck = false;
ModifierBanded.prototype.activeInSignatureCards = false;
ModifierBanded.prototype.activeOnBoard = true;
ModifierBanded.prototype.fxResource = ['FX.Modifiers.ModifierZealed'];

module.exports = ModifierBanded;
