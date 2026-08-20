/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DrawCardAction = require('app/sdk/actions/drawCardAction');
const ModifierSummonWatchFromActionBar = require('./modifierSummonWatchFromActionBar');

class ModifierSummonWatchFromActionBarByRaceBothPlayersDraw extends ModifierSummonWatchFromActionBar {
  declare type: any;
  declare targetRaceId: any;
  declare drawAmount: any;

  static type = 'ModifierSummonWatchFromActionBarByRaceBothPlayersDraw';

  static createContextObject(targetRaceId, drawAmount, options) {
    const contextObject = super.createContextObject(options);
    contextObject.targetRaceId = targetRaceId;
    contextObject.drawAmount = drawAmount;
    return contextObject;
  }

  onSummonWatch(action) {
    return (() => {
      const result = [];
      for (
        let x = 1, end = this.drawAmount, asc = end >= 1;
        asc ? x <= end : x >= end;
        asc ? x++ : x--
      ) {
        var general = this.getCard()
          .getGameSession()
          .getGeneralForPlayerId(this.getCard().getOwnerId());
        this.getGameSession().executeAction(
          new DrawCardAction(this.getGameSession(), general.getOwnerId()),
        );

        var enemyGeneral = this.getCard()
          .getGameSession()
          .getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId());
        result.push(
          this.getGameSession().executeAction(
            new DrawCardAction(this.getGameSession(), enemyGeneral.getOwnerId()),
          ),
        );
      }
      return result;
    })();
  }

  getIsCardRelevantToWatcher(card) {
    return card.getBelongsToTribe(this.targetRaceId);
  }
}
ModifierSummonWatchFromActionBarByRaceBothPlayersDraw.prototype.type =
  'ModifierSummonWatchFromActionBarByRaceBothPlayersDraw';
ModifierSummonWatchFromActionBarByRaceBothPlayersDraw.prototype.targetRaceId = null;
ModifierSummonWatchFromActionBarByRaceBothPlayersDraw.prototype.drawAmount = 1;

module.exports = ModifierSummonWatchFromActionBarByRaceBothPlayersDraw;
