/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const Modifier = require('./modifier');
const ModifierSpellWatch = require('./modifierSpellWatch');

class ModifierSpellWatchPutCardInHand extends ModifierSpellWatch {
  static type = 'ModifierSpellWatchPutCardInHand';
  static modifierName = 'Spell Watch (Put Card In Hand)';
  static description = 'Whenever you play a spell, put a a card in your Action Bar';

  static createContextObject(cardDataOrIndexToPutInHand, options) {
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToPutInHand = cardDataOrIndexToPutInHand;
    return contextObject;
  }

  onSpellWatch(action) {
    const a = new PutCardInHandAction(this.getGameSession(), this.getCard().getOwnerId(), this.cardDataOrIndexToPutInHand);
    return this.getGameSession().executeAction(a);
  }
}
ModifierSpellWatchPutCardInHand.prototype.type = 'ModifierSpellWatchPutCardInHand';
ModifierSpellWatchPutCardInHand.prototype.fxResource = ['FX.Modifiers.ModifierSpellWatch'];

module.exports = ModifierSpellWatchPutCardInHand;
