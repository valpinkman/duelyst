/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const KillAction = require('@duelyst/sdk/actions/killAction');
const ModifierStartTurnWatch = require('./modifierStartTurnWatch');

class ModifierStartTurnWatchDestroySelfAndEnemies extends ModifierStartTurnWatch {
  declare type: any;

  static type = 'ModifierStartTurnWatchDestroySelfAndEnemies';
  static description = 'At the start of your turn, destroy this minion and all enemy minions';

  onTurnWatch(action) {
    let killAction;
    for (var enemyUnit of Array.from<any>(
      this.getGameSession().getBoard().getEnemyEntitiesForEntity(this.getCard(), CardType.Unit),
    )) {
      if (!enemyUnit.getIsGeneral()) {
        killAction = new KillAction(this.getGameSession());
        killAction.setOwnerId(this.getCard().getOwnerId());
        killAction.setSource(this.getCard());
        killAction.setTarget(enemyUnit);
        this.getGameSession().executeAction(killAction);
      }
    }

    killAction = new KillAction(this.getGameSession());
    killAction.setOwnerId(this.getCard().getOwnerId());
    killAction.setSource(this.getCard());
    killAction.setTarget(this.getCard());
    return this.getGameSession().executeAction(killAction);
  }
}
ModifierStartTurnWatchDestroySelfAndEnemies.prototype.type =
  'ModifierStartTurnWatchDestroySelfAndEnemies';

module.exports = ModifierStartTurnWatchDestroySelfAndEnemies;
