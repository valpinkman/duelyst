/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierHallowedGroundBuff extends Modifier {
  declare type: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierHallowedGroundBuff';
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
    contextObject.auraIncludeGeneral = true;
    contextObject.auraRadius = 0;
    return contextObject;
  }
}
ModifierHallowedGroundBuff.prototype.type = 'ModifierHallowedGroundBuff';
ModifierHallowedGroundBuff.modifierName = i18next.t('modifiers.hallowed_ground_buff_name');
ModifierHallowedGroundBuff.description = i18next.t('modifiers.hallowed_ground_buff_def');

module.exports = ModifierHallowedGroundBuff;
