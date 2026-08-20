/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const BurnCardAction = require('app/sdk/actions/burnCardAction');
const ModifierSummonWatch = require('./modifierSummonWatch');

class ModifierSummonWatchBurnOpponentCards extends ModifierSummonWatch {
  declare type: any;
  declare cardsToBurn: any;
  declare fxResource: any;

  static type = 'ModifierSummonWatchBurnOpponentCards';

  static createContextObject(cardsToBurn, options) {
    if (cardsToBurn == null) {
      cardsToBurn = 1;
    }
    const contextObject = super.createContextObject(options);
    contextObject.cardsToBurn = cardsToBurn;
    return contextObject;
  }

  onSummonWatch(action) {
    return (() => {
      const result = [];
      for (
        let i = 1, end = this.cardsToBurn, asc = end >= 1;
        asc ? i <= end : i >= end;
        asc ? i++ : i--
      ) {
        var burnCardAction = new BurnCardAction(
          this.getGameSession(),
          this.getGameSession().getGeneralForOpponentOfPlayerId(this.getOwnerId()).getOwnerId(),
        );
        result.push(this.getGameSession().executeAction(burnCardAction));
      }
      return result;
    })();
  }
}
ModifierSummonWatchBurnOpponentCards.prototype.type = 'ModifierSummonWatchBurnOpponentCards';
ModifierSummonWatchBurnOpponentCards.prototype.cardsToBurn = 1;
ModifierSummonWatchBurnOpponentCards.prototype.fxResource = ['FX.Modifiers.ModifierSummonWatch'];

module.exports = ModifierSummonWatchBurnOpponentCards;
