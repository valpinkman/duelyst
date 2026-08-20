/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const ModifierSynergize = require('./modifierSynergize');

class ModifierSynergizePutCardInHand extends ModifierSynergize {
  declare type: any;
  declare fxResource: any;
  declare cardDataOrIndexToPutInHand: any;

  static type = 'ModifierSynergizePutCardInHand';

  static createContextObject(cardDataOrIndexToPutInHand, options) {
    if (options == null) {
      options = undefined;
    }
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToPutInHand = cardDataOrIndexToPutInHand;
    return contextObject;
  }

  onSynergize(action) {
    const a = new PutCardInHandAction(
      this.getGameSession(),
      this.getCard().getOwnerId(),
      this.cardDataOrIndexToPutInHand,
    );
    return this.getGameSession().executeAction(a);
  }
}
ModifierSynergizePutCardInHand.prototype.type = 'ModifierSynergizePutCardInHand';
ModifierSynergizePutCardInHand.prototype.fxResource = ['FX.Modifiers.ModifierSynergize'];
ModifierSynergizePutCardInHand.prototype.cardDataOrIndexToPutInHand = null;

module.exports = ModifierSynergizePutCardInHand;
