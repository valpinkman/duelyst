/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardFromHandAction = require('app/sdk/actions/playCardFromHandAction');
const CardType = require('app/sdk/cards/cardType');
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const ModifierSummonWatch = require('./modifierSummonWatch');

class ModifierSummonWatchPutCardInHand extends ModifierSummonWatch {
  static type = 'ModifierSummonWatchPutCardInHand';
  static modifierName = 'Summon Watch (put card in hand)';
  static description = 'Whenever you summon a minion, you gain a %X in your Action bar';

  static createContextObject(cardDataOrIndexToPutInHand, cardDescription, options) {
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToPutInHand = cardDataOrIndexToPutInHand;
    contextObject.cardDescription = cardDescription;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/, modifierContextObject.cardDescription);
    }
    return this.description;
  }

  onSummonWatch(action) {
    const a = new PutCardInHandAction(this.getGameSession(), this.getCard().getOwnerId(), this.cardDataOrIndexToPutInHand);
    return this.getGameSession().executeAction(a);
  }
}
ModifierSummonWatchPutCardInHand.prototype.type = 'ModifierSummonWatchPutCardInHand';
ModifierSummonWatchPutCardInHand.prototype.cardDataOrIndexToPutInHand = null;

module.exports = ModifierSummonWatchPutCardInHand;
