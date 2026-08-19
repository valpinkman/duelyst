/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const ModifierKillWatch = require('./modifierKillWatch');

class ModifierKillWatchBounceEnemyToActionBar extends ModifierKillWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierKillWatchBounceEnemyToActionBar';
  static modifierName = 'Kill Watch';
  static description = 'When this destroys a minion, bounce the enemy minion to its action bar.';

  onKillWatch(action) {
    super.onKillWatch(action);

    const enemyEntity = action.getTarget();
    if ((enemyEntity != null) && !enemyEntity.getIsGeneral()) {
      const cardToAddToHand = enemyEntity.createNewCardData();
      const opponentId = enemyEntity.getOwnerId();
      const putCardInHandAction = new PutCardInHandAction(this.getGameSession(), opponentId, cardToAddToHand);
      return this.getGameSession().executeAction(putCardInHandAction);
    }
  }
}
ModifierKillWatchBounceEnemyToActionBar.prototype.type = 'ModifierKillWatchBounceEnemyToActionBar';
ModifierKillWatchBounceEnemyToActionBar.prototype.fxResource = ['FX.Modifiers.ModifierKillWatch'];

module.exports = ModifierKillWatchBounceEnemyToActionBar;
