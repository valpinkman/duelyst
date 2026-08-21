/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifier = require('./playerModifier');
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const UtilsGameSession = require('app/sdk/utils/utils_game_session');
const CONFIG = require('app/common/config');

class PlayerModifierEndTurnRespawnEntityAnywhere extends PlayerModifier {
  declare type: any;
  declare durationEndTurn: any;
  declare cardDataOrIndexToSpawn: any;

  static type = 'PlayerModifierEndTurnRespawnEntityAnywhere';
  static isHiddenToUI = true;

  static createContextObject(cardDataOrIndexToSpawn, options) {
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToSpawn = cardDataOrIndexToSpawn;
    return contextObject;
  }

  onEndTurn(action) {
    super.onEndTurn(action);

    if (
      this.getGameSession().getIsRunningAsAuthoritative() &&
      this.cardDataOrIndexToSpawn != null
    ) {
      const card = this.getGameSession().getExistingCardFromIndexOrCachedCardFromData(
        this.cardDataOrIndexToSpawn,
      );
      const validSpawnLocations = UtilsGameSession.getSmartSpawnPositionsFromPattern(
        this.getGameSession(),
        { x: 0, y: 0 },
        CONFIG.PATTERN_WHOLE_BOARD,
        card,
      );
      if (validSpawnLocations.length > 0) {
        const spawnLocation =
          validSpawnLocations[
            this.getGameSession().getRandomIntegerForExecution(validSpawnLocations.length)
          ];
        const playCardAction = new PlayCardSilentlyAction(
          this.getGameSession(),
          this.getPlayer().getPlayerId(),
          spawnLocation.x,
          spawnLocation.y,
          this.cardDataOrIndexToSpawn,
        );
        playCardAction.setSource(this.getCard());
        return this.getGameSession().executeAction(playCardAction);
      }
    }
  }
}
PlayerModifierEndTurnRespawnEntityAnywhere.prototype.type =
  'PlayerModifierEndTurnRespawnEntityAnywhere';
PlayerModifierEndTurnRespawnEntityAnywhere.prototype.durationEndTurn = 1;
PlayerModifierEndTurnRespawnEntityAnywhere.prototype.cardDataOrIndexToSpawn = null;

module.exports = PlayerModifierEndTurnRespawnEntityAnywhere;
