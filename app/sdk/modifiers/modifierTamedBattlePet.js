/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Modifier = require('./modifier');

class ModifierTamedBattlePet extends Modifier {
  static type = 'ModifierTamedBattlePet';
  static modifierName = 'Tamed Battle Pet';
  static description = 'Listens to owner\'s commands';
}
ModifierTamedBattlePet.prototype.type = 'ModifierTamedBattlePet';
ModifierTamedBattlePet.prototype.activeInHand = false;
ModifierTamedBattlePet.prototype.activeInDeck = false;
ModifierTamedBattlePet.prototype.activeInSignatureCards = false;
ModifierTamedBattlePet.prototype.activeOnBoard = true;
ModifierTamedBattlePet.prototype.fxResource = ['FX.Modifiers.ModifierTamedBattlePet'];

module.exports = ModifierTamedBattlePet;
