/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierAlwaysInfiltrated = require('app/sdk/modifiers/modifierAlwaysInfiltrated');
const Modifier = require('./modifier');

class ModifierProvidesAlwaysInfiltrated extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierProvidesAlwaysInfiltrated';
  static isHiddenToUI = true;
}
ModifierProvidesAlwaysInfiltrated.prototype.type = 'ModifierProvidesAlwaysInfiltrated';
ModifierProvidesAlwaysInfiltrated.prototype.activeInHand = false;
ModifierProvidesAlwaysInfiltrated.prototype.activeInDeck = false;
ModifierProvidesAlwaysInfiltrated.prototype.activeInSignatureCards = false;
ModifierProvidesAlwaysInfiltrated.prototype.activeOnBoard = true;
ModifierProvidesAlwaysInfiltrated.prototype.fxResource = [
  'FX.Modifiers.ModifierProvidesAlwaysInfiltrated',
];

module.exports = ModifierProvidesAlwaysInfiltrated;
