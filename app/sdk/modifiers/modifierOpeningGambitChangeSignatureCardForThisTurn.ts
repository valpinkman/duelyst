/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifierEndTurnWatchRevertBBS = require('app/sdk/playerModifiers/playerModifierEndTurnWatchRevertBBS');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitChangeSignatureCardForThisTurn extends ModifierOpeningGambit {
  declare type: any;
  declare fxResource: any;
  declare cardData: any;

  static type = 'ModifierOpeningGambitChangeSignatureCardForThisTurn';

  static createContextObject(cardData) {
    const contextObject = super.createContextObject();
    contextObject.cardData = cardData;
    return contextObject;
  }

  onOpeningGambit(action) {
    super.onOpeningGambit(action);

    const general = this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId());

    // only add modifier to revert if one doesn't already exist, so we don't revert to a temp BBS
    if (!general.hasActiveModifierClass(PlayerModifierEndTurnWatchRevertBBS)) {
      const currentBBS = general.getSignatureCardData();
      const revertBBSModifier = PlayerModifierEndTurnWatchRevertBBS.createContextObject(currentBBS);
      revertBBSModifier.durationEndTurn = 1;
      this.getGameSession().applyModifierContextObject(revertBBSModifier, general);
    }

    general.setSignatureCardData(this.cardData);
    return this.getGameSession().executeAction(general.getOwner().actionGenerateSignatureCard());
  }
}
ModifierOpeningGambitChangeSignatureCardForThisTurn.prototype.type =
  'ModifierOpeningGambitChangeSignatureCardForThisTurn';
ModifierOpeningGambitChangeSignatureCardForThisTurn.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
];
ModifierOpeningGambitChangeSignatureCardForThisTurn.prototype.cardData = null;

module.exports = ModifierOpeningGambitChangeSignatureCardForThisTurn;
