/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const CardType = require('@duelyst/sdk/cards/cardType');
const _ = require('underscore');
const ModifierBond = require('./modifierBond');
const Modifier = require('./modifier');

class ModifierBondDrawCards extends ModifierBond {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierBondDrawCards';
  static description = 'Draw some cards from the deck';

  static createContextObject(numCards) {
    const contextObject = super.createContextObject();
    contextObject.numCards = numCards;
    return contextObject;
  }

  onBond() {
    return (() => {
      const result = [];
      for (
        let i = 0, end = this.numCards, asc = end >= 0;
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
ModifierBondDrawCards.prototype.type = 'ModifierBondDrawCards';
ModifierBondDrawCards.prototype.fxResource = ['FX.Modifiers.ModifierBond'];

module.exports = ModifierBondDrawCards;
