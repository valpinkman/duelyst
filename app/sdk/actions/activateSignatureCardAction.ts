/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Action = require('./action');

/*
Action that activates a player's signature card.
*/

class ActivateSignatureCardAction extends Action {
  declare targetPlayerId: any;

  static type = 'ActivateSignatureCardAction';

  constructor(gameSession, targetPlayerId) {
    super(gameSession);
    if (targetPlayerId != null) {
      this.targetPlayerId = targetPlayerId;
    } else {
      this.targetPlayerId = this.getOwnerId();
    }
  }

  isRemovableDuringScrubbing() {
    return false;
  }

  getTargetPlayer() {
    return this.getGameSession().getPlayerById(this.getTargetPlayerId());
  }

  getTargetPlayerId() {
    return this.targetPlayerId;
  }

  _execute() {
    super._execute();

    return this.getTargetPlayer().setIsSignatureCardActive(true);
  }
}
ActivateSignatureCardAction.prototype.targetPlayerId = null;

module.exports = ActivateSignatureCardAction;
