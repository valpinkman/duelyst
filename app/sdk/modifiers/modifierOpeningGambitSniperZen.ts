/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const SwapUnitAllegianceAction = require('app/sdk/actions/swapUnitAllegianceAction');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitSniperZen extends ModifierOpeningGambit {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitSniperZen';

  onOpeningGambit() {
    const position = this.getCard().getPosition();
    const units = this.getGameSession().getBoard().getEntitiesInRow(position.y, CardType.Unit);
    if (units != null) {
      return (() => {
        const result = [];
        for (var unit of Array.from<any>(units)) {
          if (
            unit != null &&
            !unit.getIsGeneral() &&
            unit.getOwnerId() !== this.getCard().getOwnerId() &&
            unit.getATK() <= 2
          ) {
            var a = new SwapUnitAllegianceAction(this.getGameSession());
            a.setTarget(unit);
            result.push(this.getGameSession().executeAction(a));
          } else {
            result.push(undefined);
          }
        }
        return result;
      })();
    }
  }
}
ModifierOpeningGambitSniperZen.prototype.type = 'ModifierOpeningGambitSniperZen';
ModifierOpeningGambitSniperZen.prototype.fxResource = ['FX.Modifiers.ModifierOpeningGambit'];

module.exports = ModifierOpeningGambitSniperZen;
