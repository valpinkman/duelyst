/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Modifier = require('./modifier');

/*
  Abstract modifier that should be the superclass for any modifiers that prevent a unit from doing something.
*/
class ModifierCannot extends Modifier {
  static type = 'ModifierCannot';
  static modifierName = 'Cannot';
  static description = '';
}
ModifierCannot.prototype.type = 'ModifierCannot';
ModifierCannot.prototype.activeInHand = false;
ModifierCannot.prototype.activeInDeck = false;
ModifierCannot.prototype.activeInSignatureCards = false;
ModifierCannot.prototype.activeOnBoard = true;
ModifierCannot.prototype.fxResource = ['FX.Modifiers.ModifierCannot'];

module.exports = ModifierCannot;
