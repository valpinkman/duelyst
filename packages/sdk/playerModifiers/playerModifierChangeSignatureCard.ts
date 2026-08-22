/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifier = require('@duelyst/sdk/playerModifiers/playerModifier');

class PlayerModifierChangeSignatureCard extends PlayerModifier {
  declare type: any;

  static type = 'PlayerModifierChangeSignatureCard';

  static createContextObject(cardDataOrIndex, options) {
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndex = cardDataOrIndex;
    return contextObject;
  }

  getSignatureCardData() {
    return this.cardDataOrIndex;
  }

  onActivate() {
    super.onActivate();

    return this.getGameSession().executeAction(this.getPlayer().actionGenerateSignatureCard());
  }

  onDeactivate() {
    super.onDeactivate();

    return this.getGameSession().executeAction(this.getPlayer().actionGenerateSignatureCard());
  }
}
PlayerModifierChangeSignatureCard.prototype.type = 'PlayerModifierChangeSignatureCard';

module.exports = PlayerModifierChangeSignatureCard;
