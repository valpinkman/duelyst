/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierInfiltrate = require('app/sdk/modifiers/modifierInfiltrate');
const Modifier = require('./modifier');

class ModifierAlwaysInfiltrated extends Modifier {
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
