/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const ModifierMyMoveWatchAnyReason = require('./modifierMyMoveWatchAnyReason');

class ModifierMyMoveWatchAnyReasonDrawCard extends ModifierMyMoveWatchAnyReason {
  declare type: any;
  declare fxResource: any;
  declare drawAmount: any;

  static type = 'ModifierMyMoveWatchAnyReasonDrawCard';

  static createContextObject(drawAmount, options) {
    if (drawAmount == null) {
      drawAmount = 1;
    }
    const contextObject = super.createContextObject();
    contextObject.drawAmount = drawAmount;
    return contextObject;
  }

  onMyMoveWatchAnyReason(action) {
    return (() => {
      const result = [];
      for (
        let i = 0, end = this.drawAmount, asc = end >= 0;
        asc ? i < end : i > end;
        asc ? i++ : i--
      ) {
        var deck = this.getGameSession().getPlayerById(this.getCard().getOwnerId()).getDeck();
        result.push(this.getCard().getGameSession().executeAction(deck.actionDrawCard()));
      }
      return result;
    })();
  }
}
ModifierMyMoveWatchAnyReasonDrawCard.prototype.type = 'ModifierMyMoveWatchAnyReasonDrawCard';
ModifierMyMoveWatchAnyReasonDrawCard.prototype.fxResource = ['FX.Modifiers.ModifierMyMoveWatch'];
ModifierMyMoveWatchAnyReasonDrawCard.prototype.drawAmount = 1;

module.exports = ModifierMyMoveWatchAnyReasonDrawCard;
