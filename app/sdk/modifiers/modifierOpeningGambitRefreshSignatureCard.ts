/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierOpeningGambit = require('app/sdk/modifiers/modifierOpeningGambit');

class ModifierOpeningGambitRefreshSignatureCard extends ModifierOpeningGambit {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitRefreshSignatureCard';
  static modifierName = 'Opening Gambit';
  static description = 'Refresh your Bloodbound Spell';

  onOpeningGambit() {
    return this.getGameSession().executeAction(this.getOwner().actionActivateSignatureCard());
  }
}
ModifierOpeningGambitRefreshSignatureCard.prototype.type =
  'ModifierOpeningGambitRefreshSignatureCard';
ModifierOpeningGambitRefreshSignatureCard.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
];

module.exports = ModifierOpeningGambitRefreshSignatureCard;
