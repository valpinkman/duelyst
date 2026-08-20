/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const KillAction = require('app/sdk/actions/killAction');
const ModifierMyAttackMinionWatch = require('./modifierMyAttackMinionWatch');

class ModifierMyAttackMinionWatchKillTargetSummonThisOnSpace extends ModifierMyAttackMinionWatch {
  declare type: any;
  declare fxResource: any;
  declare maxStacks: any;

  static type = 'ModifierMyAttackMinionWatchKillTargetSummonThisOnSpace';

  onMyAttackMinionWatch(action) {
    const target = action.getTarget();
    if (target != null) {
      const killAction = new KillAction(this.getGameSession());
      killAction.setOwnerId(this.getCard().getOwnerId());
      killAction.setSource(this.getCard());
      killAction.setTarget(target);
      this.getGameSession().executeAction(killAction);

      const position = target.getPosition();
      const playCardAction = new PlayCardSilentlyAction(
        this.getGameSession(),
        this.getCard().getOwnerId(),
        position.x,
        position.y,
        this.getCard().createNewCardData(),
      );
      playCardAction.setSource(this.getCard());
      return this.getGameSession().executeAction(playCardAction);
    }
  }
}
ModifierMyAttackMinionWatchKillTargetSummonThisOnSpace.prototype.type =
  'ModifierMyAttackMinionWatchKillTargetSummonThisOnSpace';
ModifierMyAttackMinionWatchKillTargetSummonThisOnSpace.prototype.fxResource = [
  'FX.Modifiers.ModifierGenericKill',
];
ModifierMyAttackMinionWatchKillTargetSummonThisOnSpace.prototype.maxStacks = 1;

module.exports = ModifierMyAttackMinionWatchKillTargetSummonThisOnSpace;
