/*
 * decaffeinate suggestions:
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierAlwaysInfiltrated = require('app/sdk/modifiers/modifierAlwaysInfiltrated');
const Modifier = require('./modifier');

class ModifierProvidesAlwaysInfiltrated extends Modifier {
  static initClass() {
    this.prototype.type = 'ModifierProvidesAlwaysInfiltrated';
    this.type = 'ModifierProvidesAlwaysInfiltrated';

    this.isHiddenToUI = true;

    this.prototype.activeInHand = false;
    this.prototype.activeInDeck = false;
    this.prototype.activeInSignatureCards = false;
    this.prototype.activeOnBoard = true;

    this.prototype.fxResource = ['FX.Modifiers.ModifierProvidesAlwaysInfiltrated'];
  }
}
ModifierProvidesAlwaysInfiltrated.initClass();

module.exports = ModifierProvidesAlwaysInfiltrated;
