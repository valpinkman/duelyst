/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Cards = require('@duelyst/sdk/cards/cardsLookupComplete');
const ModifierOpeningGambitChangeSignatureCard = require('./modifierOpeningGambitChangeSignatureCard');

class ModifierOpeningGambitGrandmasterVariax extends ModifierOpeningGambitChangeSignatureCard {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitGrandmasterVariax';
  static modifierName = 'Opening Gambit';
  static description = 'Your Bloodbound Spell costs 3 and is now AWESOME';

  onOpeningGambit(action) {
    // choose signature spell to replace based on General
    if (
      this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId()).getBaseCardId() ===
      Cards.Faction4.AltGeneral
    ) {
      this.cardData = { id: Cards.Spell.SummonFiends };
    } else if (
      this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId()).getBaseCardId() ===
      Cards.Faction4.ThirdGeneral
    ) {
      this.cardData = { id: Cards.Spell.SummonHusks };
    } else {
      // Lilithe's spell is more widely useful so make it default
      this.cardData = { id: Cards.Spell.FuriousLings };
    }
    return super.onOpeningGambit(action);
  }
}
ModifierOpeningGambitGrandmasterVariax.prototype.type = 'ModifierOpeningGambitGrandmasterVariax';
ModifierOpeningGambitGrandmasterVariax.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
];

module.exports = ModifierOpeningGambitGrandmasterVariax;
