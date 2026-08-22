/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierOpeningGambit = require('@duelyst/sdk/modifiers/modifierOpeningGambit');

class ModifierOpeningGambitActivateSignatureCard extends ModifierOpeningGambit {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitActivateSignatureCard';
  static modifierName = 'Opening Gambit';
  static description = "Refresh your General's Bloodbound Spell";

  onOpeningGambit() {
    const player = this.getCard().getGameSession().getPlayerById(this.getCard().getOwnerId());
    return this.getGameSession().executeAction(player.actionGenerateSignatureCard());
  }
}
ModifierOpeningGambitActivateSignatureCard.prototype.type =
  'ModifierOpeningGambitActivateSignatureCard';
ModifierOpeningGambitActivateSignatureCard.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
];

module.exports = ModifierOpeningGambitActivateSignatureCard;
