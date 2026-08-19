/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const ModifierBackstabWatch = require('./modifierBackstabWatch');

class ModifierBackstabWatchAddCardToHand extends ModifierBackstabWatch {
  declare type: any;
  declare cardToAdd: any;
  declare numToAdd: any;

  static type = 'ModifierBackstabWatchAddCardToHand';

  static createContextObject(cardToAdd, numToAdd, options) {
    const contextObject = super.createContextObject(options);
    contextObject.cardToAdd = cardToAdd;
    contextObject.numToAdd = numToAdd;
    return contextObject;
  }

  onBackstabWatch(action) {
    return (() => {
      const result = [];
      for (let i = 0, end = this.numToAdd, asc = end >= 0; asc ? i < end : i > end; asc ? i++ : i--) {
        var putCardInHandAction = new PutCardInHandAction(this.getGameSession(), this.getOwnerId(), this.cardToAdd);
        result.push(this.getGameSession().executeAction(putCardInHandAction));
      }
      return result;
    })();
  }
}
ModifierBackstabWatchAddCardToHand.prototype.type = 'ModifierBackstabWatchAddCardToHand';
ModifierBackstabWatchAddCardToHand.prototype.cardToAdd = null;
ModifierBackstabWatchAddCardToHand.prototype.numToAdd = 0;

module.exports = ModifierBackstabWatchAddCardToHand;
