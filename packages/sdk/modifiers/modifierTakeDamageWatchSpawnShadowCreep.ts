/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardSilentlyAction = require('@duelyst/sdk/actions/playCardSilentlyAction');
const Cards = require('@duelyst/sdk/cards/cardsLookupComplete');
const ModifierTakeDamageWatch = require('./modifierTakeDamageWatch');

class ModifierTakeDamageWatchSpawnShadowCreep extends ModifierTakeDamageWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierTakeDamageWatchSpawnShadowCreep';
  static modifierName = 'Take Damage Watch';
  static description =
    'Whenever this minion takes damage, turn a space occupied by an enemy into Shadow Creep';

  onDamageTaken(action) {
    super.onDamageTaken(action);

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const allEnemies = this.getGameSession().getBoard().getEnemyEntitiesForEntity(this.getCard());
      const enemyToSpawnUnder =
        allEnemies[this.getGameSession().getRandomIntegerForExecution(allEnemies.length)];
      const playCardAction = new PlayCardSilentlyAction(
        this.getGameSession(),
        this.getCard().getOwnerId(),
        enemyToSpawnUnder.getPosition().x,
        enemyToSpawnUnder.getPosition().y,
        { id: Cards.Tile.Shadow },
      );
      playCardAction.setSource(this.getCard());
      return this.getGameSession().executeAction(playCardAction);
    }
  }
}
ModifierTakeDamageWatchSpawnShadowCreep.prototype.type = 'ModifierTakeDamageWatchSpawnShadowCreep';
ModifierTakeDamageWatchSpawnShadowCreep.prototype.fxResource = [
  'FX.Modifiers.ModifierDyingWish',
  'FX.Modifiers.ModifierGenericSpawn',
];

module.exports = ModifierTakeDamageWatchSpawnShadowCreep;
