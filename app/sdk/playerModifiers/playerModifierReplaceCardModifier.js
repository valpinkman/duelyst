/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifier = require('app/sdk/playerModifiers/playerModifier');
const CardType = require('app/sdk/cards/cardType');

class PlayerModifierReplaceCardModifier extends PlayerModifier {
  static type = 'PlayerModifierReplaceCardModifier';

  static createContextObject(replaceCardChange, duration, options) {
    if (duration == null) { duration = 0; }
    const contextObject = super.createContextObject(options);
    contextObject.replaceCardChange = replaceCardChange;
    contextObject.durationEndTurn = duration;
    return contextObject;
  }

  getReplaceCardChange() {
    if (this.getIsActive()) {
      return this.replaceCardChange;
    }
    return 0;
  }
}
PlayerModifierReplaceCardModifier.prototype.type = 'PlayerModifierReplaceCardModifier';

module.exports = PlayerModifierReplaceCardModifier;
