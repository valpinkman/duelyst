/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierTranscendance extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare maxStacks: any;
  declare attributeBuffs: any;
  declare fxResource: any;
  declare static keywordDefinition: any;
  declare static modifierName: any;

  static type = 'ModifierTranscendance';
  static isKeyworded = true;
  static description = '';
}
ModifierTranscendance.prototype.type = 'ModifierTranscendance';
ModifierTranscendance.keywordDefinition = i18next.t('modifiers.celerity_def');
ModifierTranscendance.modifierName = i18next.t('modifiers.celerity_name');
ModifierTranscendance.prototype.activeInHand = false;
ModifierTranscendance.prototype.activeInDeck = false;
ModifierTranscendance.prototype.activeInSignatureCards = false;
ModifierTranscendance.prototype.activeOnBoard = true;
ModifierTranscendance.prototype.maxStacks = 1;
ModifierTranscendance.prototype.attributeBuffs = {
  attacks: 1,
  moves: 1,
};
ModifierTranscendance.prototype.fxResource = ['FX.Modifiers.ModifierCelerity'];

module.exports = ModifierTranscendance;
