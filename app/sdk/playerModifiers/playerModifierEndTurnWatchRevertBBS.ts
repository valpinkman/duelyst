/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifier = require('./playerModifier');

class PlayerModifierEndTurnWatchRevertBBS extends PlayerModifier {
  declare type: any;
  declare bbsToRevertTo: any;

  static type = 'PlayerModifierEndTurnWatchRevertBBS';

  static createContextObject(bbsToRevertTo) {
    const contextObject = super.createContextObject();
    contextObject.bbsToRevertTo = bbsToRevertTo;
    return contextObject;
  }

  onEndTurn(action) {
    super.onEndTurn(action);
    if (this.bbsToRevertTo != null) {
      this.getCard().setSignatureCardData(this.bbsToRevertTo);
      return this.getGameSession().executeAction(
        this.getCard().getOwner().actionGenerateSignatureCard(),
      );
    }
  }
}
PlayerModifierEndTurnWatchRevertBBS.prototype.type = 'PlayerModifierEndTurnWatchRevertBBS';
PlayerModifierEndTurnWatchRevertBBS.prototype.bbsToRevertTo = null;

module.exports = PlayerModifierEndTurnWatchRevertBBS;
