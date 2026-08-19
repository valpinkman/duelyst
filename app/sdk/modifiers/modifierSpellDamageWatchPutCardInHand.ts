/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const ModifierSpellDamageWatch = require('./modifierSpellDamageWatch');

class ModifierSpellDamageWatchPutCardInHand extends ModifierSpellDamageWatch {
  declare type: any;

  static type = 'ModifierSpellDamageWatchPutCardInHand';

  static createContextObject(cardDataOrIndexToPutInHand, options) {
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToPutInHand = cardDataOrIndexToPutInHand;
    return contextObject;
  }

  onDamagingSpellcast(action) {
    const a = new PutCardInHandAction(this.getGameSession(), this.getCard().getOwnerId(), this.cardDataOrIndexToPutInHand);
    return this.getGameSession().executeAction(a);
  }
}
ModifierSpellDamageWatchPutCardInHand.prototype.type = 'ModifierSpellDamageWatchPutCardInHand';

module.exports = ModifierSpellDamageWatchPutCardInHand;
