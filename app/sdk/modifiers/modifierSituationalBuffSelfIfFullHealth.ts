/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierSituationalBuffSelf = require('./modifierSituationalBuffSelf');

class ModifierSituationalBuffSelfIfFullHealth extends ModifierSituationalBuffSelf {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;

  static type = 'ModifierSituationalBuffSelfIfFullHealth';
  static modifierName = 'ModifierSituationalBuffSelfIfFullHealth';

  static createContextObject(modifierContextObjects, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifierContextObjects;
    return contextObject;
  }

  getIsSituationActiveForCache() {
    if (this.getCard().getHP() === this.getCard().getMaxHP()) {
      return true;
    }
    return false;
  }
}
ModifierSituationalBuffSelfIfFullHealth.prototype.type = 'ModifierSituationalBuffSelfIfFullHealth';
ModifierSituationalBuffSelfIfFullHealth.prototype.activeInHand = false;
ModifierSituationalBuffSelfIfFullHealth.prototype.activeInDeck = false;
ModifierSituationalBuffSelfIfFullHealth.prototype.activeInSignatureCards = false;
ModifierSituationalBuffSelfIfFullHealth.prototype.activeOnBoard = true;

module.exports = ModifierSituationalBuffSelfIfFullHealth;
