/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const ModifierHealWatch = require('./modifierHealWatch');

class ModifierHealWatchPutCardInHand extends ModifierHealWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierHealWatchPutCardInHand';
  static modifierName = 'ModifierHealWatchPutCardInHand';
  static description = 'Whenever anything is healed, put %X into your action bar';

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

  onHealWatch(action) {
    const a = new PutCardInHandAction(this.getGameSession(), this.getCard().getOwnerId(), this.cardDataOrIndexToPutInHand);
    return this.getGameSession().executeAction(a);
  }
}
ModifierHealWatchPutCardInHand.prototype.type = 'ModifierHealWatchPutCardInHand';
ModifierHealWatchPutCardInHand.prototype.fxResource = ['FX.Modifiers.ModifierFriendlyMinionHealWatch'];

module.exports = ModifierHealWatchPutCardInHand;
