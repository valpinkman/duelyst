/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Modifier = require('./modifier');

/*
  Abstract modifier superclass for all modifiers that add some type of immunity.
*/

class ModifierImmune extends Modifier {
  static type = 'ModifierImmune';
  static modifierName = 'Immune';
  static description = '';
}
ModifierImmune.prototype.type = 'ModifierImmune';
ModifierImmune.prototype.activeInHand = false;
ModifierImmune.prototype.activeInDeck = false;
ModifierImmune.prototype.activeInSignatureCards = false;
ModifierImmune.prototype.activeOnBoard = true;
ModifierImmune.prototype.maxStacks = 1;
ModifierImmune.prototype.fxResource = ['FX.Modifiers.ModifierImmunity'];

module.exports = ModifierImmune;
