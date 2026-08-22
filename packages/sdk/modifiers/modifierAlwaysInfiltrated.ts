/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierInfiltrate = require('@duelyst/sdk/modifiers/modifierInfiltrate');
const Modifier = require('./modifier');

class ModifierAlwaysInfiltrated extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierAlwaysInfiltrated';
  static isHiddenToUI = true;
}
ModifierAlwaysInfiltrated.prototype.type = 'ModifierAlwaysInfiltrated';
ModifierAlwaysInfiltrated.prototype.activeInHand = false;
ModifierAlwaysInfiltrated.prototype.activeInDeck = false;
ModifierAlwaysInfiltrated.prototype.activeInSignatureCards = false;
ModifierAlwaysInfiltrated.prototype.activeOnBoard = true;
ModifierAlwaysInfiltrated.prototype.fxResource = ['FX.Modifiers.ModifierAlwaysInfiltrated'];

module.exports = ModifierAlwaysInfiltrated;
