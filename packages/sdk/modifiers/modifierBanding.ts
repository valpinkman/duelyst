/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');

const i18next = require('i18next');
const ModifierSituationalBuffSelf = require('./modifierSituationalBuffSelf');

class ModifierBanding extends ModifierSituationalBuffSelf {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;
  declare static modifierName: any;
  declare static keywordDefinition: any;

  static type = 'ModifierBanding';
  static isKeyworded = true;

  getIsSituationActiveForCache() {
    // banding aura is active when this entity is near its general
    const entityPosition = this.getCard().getPosition();
    const general = this.getCard()
      .getGameSession()
      .getGeneralForPlayerId(this.getCard().getOwnerId());
    if (general != null) {
      const generalPosition = general.getPosition();
      return (
        Math.abs(entityPosition.x - generalPosition.x) <= 1 &&
        Math.abs(entityPosition.y - generalPosition.y) <= 1
      );
    }

    return false;
  }
}
ModifierBanding.prototype.type = 'ModifierBanding';
ModifierBanding.modifierName = i18next.t('modifiers.zeal_name');
ModifierBanding.keywordDefinition = i18next.t('modifiers.zeal_def');
ModifierBanding.prototype.activeInHand = false;
ModifierBanding.prototype.activeInDeck = false;
ModifierBanding.prototype.activeInSignatureCards = false;
ModifierBanding.prototype.activeOnBoard = true;
ModifierBanding.prototype.fxResource = ['FX.Modifiers.ModifierZeal'];

module.exports = ModifierBanding;
