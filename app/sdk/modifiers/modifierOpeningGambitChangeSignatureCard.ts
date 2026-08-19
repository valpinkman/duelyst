/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifierEndTurnWatchRevertBBS = require('app/sdk/playerModifiers/playerModifierEndTurnWatchRevertBBS');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitChangeSignatureCard extends ModifierOpeningGambit {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitChangeSignatureCard';
  static modifierName = 'Opening Gambit';
  static description = 'Your Bloodbound Spell is %X';

  static createContextObject(cardData, cardDescription) {
    const contextObject = super.createContextObject();
    contextObject.cardData = cardData;
    contextObject.cardDescription = cardDescription;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    return this.description.replace(/%X/, modifierContextObject.cardDescription);
  }

  onOpeningGambit(action) {
    super.onOpeningGambit(action);

    const general = this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId());

    // If a revert bbs modifier exists from a temp BBS, remove it, new BBS overwrites it
    for (var modifier of Array.from<any>(general.getModifiersByClass(PlayerModifierEndTurnWatchRevertBBS))) {
      this.getGameSession().removeModifier(modifier);
    }

    general.setSignatureCardData(this.cardData);
    return this.getGameSession().executeAction(general.getOwner().actionGenerateSignatureCard());
  }
}
ModifierOpeningGambitChangeSignatureCard.prototype.type = 'ModifierOpeningGambitChangeSignatureCard';
ModifierOpeningGambitChangeSignatureCard.prototype.fxResource = ['FX.Modifiers.ModifierOpeningGambit'];

module.exports = ModifierOpeningGambitChangeSignatureCard;
