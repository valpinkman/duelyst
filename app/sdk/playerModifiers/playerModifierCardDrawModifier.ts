/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifier = require('app/sdk/playerModifiers/playerModifier');
const CardType = require('app/sdk/cards/cardType');

class PlayerModifierCardDrawModifier extends PlayerModifier {
  declare type: any;

  static type = 'PlayerModifierCardDrawModifier';

  static createContextObject(cardDrawChange, duration, options) {
    if (duration == null) {
      duration = 0;
    }
    const contextObject = super.createContextObject(options);
    contextObject.cardDrawChange = cardDrawChange;
    contextObject.durationStartTurn = duration;
    return contextObject;
  }

  getCardDrawChange() {
    if (this.getIsActive()) {
      return this.cardDrawChange;
    }
    return 0;
  }
}
PlayerModifierCardDrawModifier.prototype.type = 'PlayerModifierCardDrawModifier';

module.exports = PlayerModifierCardDrawModifier;
