/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Races = require('app/sdk/cards/racesLookup');
const ModifierOpeningGambit = require('./modifierOpeningGambit');
const Modifier = require('./modifier');

class ModifierOpeningGambitBuffSelfByBattlePetsHandStats extends ModifierOpeningGambit {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitBuffSelfByBattlePetsHandStats';
  static description = 'Gain the combined Attack and Health of all Battle Pets in your action bar';

  onOpeningGambit() {
    super.onOpeningGambit();
    let healthBuff = 0;
    let attackBuff = 0;
    for (var card of Array.from<any>(this.getCard().getOwner().getDeck().getCardsInHandExcludingMissing())) {
      if (card.getBelongsToTribe(Races.BattlePet)) {
        healthBuff += card.getMaxHP();
        attackBuff += card.getATK();
      }
    }
    const buffContextObject = Modifier.createContextObjectWithAttributeBuffs(attackBuff, healthBuff);
    buffContextObject.appliedName = 'Calculated Power';
    return this.getGameSession().applyModifierContextObject(buffContextObject, this.getCard());
  }
}
ModifierOpeningGambitBuffSelfByBattlePetsHandStats.prototype.type = 'ModifierOpeningGambitBuffSelfByBattlePetsHandStats';
ModifierOpeningGambitBuffSelfByBattlePetsHandStats.prototype.fxResource = ['FX.Modifiers.ModifierOpeningGambit', 'FX.Modifiers.ModifierGenericBuff'];

module.exports = ModifierOpeningGambitBuffSelfByBattlePetsHandStats;
