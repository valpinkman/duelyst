/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const CardType = require('app/sdk/cards/cardType');
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const _ = require('underscore');
const ModifierBond = require('./modifierBond');
const Modifier = require('./modifier');

class ModifierBondPutCardsInHand extends ModifierBond {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierBondPutCardsInHand';
  static description = 'Draw some cards';

  static createContextObject(cardIds, options) {
    const contextObject = super.createContextObject(options);
    contextObject.cardIds = cardIds;
    return contextObject;
  }

  onBond() {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const {
        cardIds,
      } = this;
      return (() => {
        const result = [];
        while ((cardIds != null ? cardIds.length : undefined) > 0) {
          var id = cardIds.splice(this.getGameSession().getRandomIntegerForExecution(cardIds.length), 1)[0];
          if (id != null) {
            var a = new PutCardInHandAction(this.getGameSession(), this.getCard().getOwnerId(), { id });
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
ModifierBondPutCardsInHand.prototype.type = 'ModifierBondPutCardsInHand';
ModifierBondPutCardsInHand.prototype.fxResource = ['FX.Modifiers.ModifierBond'];

module.exports = ModifierBondPutCardsInHand;
