/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Action = require('./action');
const GenerateSignatureCardAction = require('./generateSignatureCardAction');

/*
Action that forces signature card data to be refreshed for player
Generates a new signature card if signature card slot was active when this action executes
*/

class UpdateSignatureCardAction extends Action {
  declare targetPlayerId: any;

  static type = 'UpdateSignatureCardAction';

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

    const activeSignatureCard = this.getTargetPlayer().getCurrentSignatureCard();
    if (activeSignatureCard) {
      return this.getGameSession().executeAction(
        this.getTargetPlayer().actionGenerateSignatureCard(),
      );
    }
    this.getTargetPlayer().flushCachedReferenceSignatureCard();
    return this.getGameSession()
      .getGeneralForPlayerId(this.getTargetPlayerId())
      .flushCachedReferenceSignatureCard();
  }
}
UpdateSignatureCardAction.prototype.targetPlayerId = null;

module.exports = UpdateSignatureCardAction;
