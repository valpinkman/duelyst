/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const SpellIntensify = require('./spellIntensify');
const Cards = require('@duelyst/sdk/cards/cardsLookupComplete');
const PlayCardSilentlyAction = require('@duelyst/sdk/actions/playCardSilentlyAction');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const CONFIG = require('@duelyst/common/config');

class SpellIntensifyShadowBlossom extends SpellIntensify {
  declare spawnCount: any;

  onApplyOneEffectToBoard(board, x, y, sourceAction) {
    super.onApplyOneEffectToBoard(board, x, y, sourceAction);

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      let spawnPosition;
      const possiblePositions = [];
      board = this.getGameSession().getBoard();
      for (var unit of Array.from<any>(board.getUnits())) {
        if (unit != null && !unit.getIsGeneral() && unit.getOwnerId() !== this.getOwnerId()) {
          var tileAtPosition = board.getTileAtPosition(unit.getPosition(), true);
          if (
            tileAtPosition == null ||
            tileAtPosition.getBaseCardId() !== Cards.Tile.Shadow ||
            tileAtPosition.getOwnerId() !== this.getOwnerId()
          ) {
            possiblePositions.push(unit.getPosition());
          }
        }
      }

      const totalSpawnAmount = this.getIntensifyAmount() * this.spawnCount;
      const numToSpawnUnderEnemies = Math.min(totalSpawnAmount, possiblePositions.length);
      const remainderToSpawn = totalSpawnAmount - numToSpawnUnderEnemies;

      for (
        let i = 0, end = numToSpawnUnderEnemies, asc = end >= 0;
        asc ? i < end : i > end;
        asc ? i++ : i--
      ) {
        spawnPosition = possiblePositions.splice(
          this.getGameSession().getRandomIntegerForExecution(possiblePositions.length),
          1,
        )[0];
        var playCardAction = new PlayCardSilentlyAction(
          this.getGameSession(),
          this.getOwnerId(),
          spawnPosition.x,
          spawnPosition.y,
          { id: Cards.Tile.Shadow },
        );
        this.getGameSession().executeAction(playCardAction);
      }

      if (remainderToSpawn > 0) {
        const tileCard = this.getGameSession().getExistingCardFromIndexOrCachedCardFromData({
          id: Cards.Tile.Shadow,
        });
        const spawnPositions = UtilsGameSession.getRandomSmartSpawnPositionsFromPattern(
          this.getGameSession(),
          { x: 0, y: 0 },
          CONFIG.PATTERN_WHOLE_BOARD,
          tileCard,
          this,
          remainderToSpawn,
        );
        return (() => {
          const result = [];
          for (spawnPosition of Array.from<any>(spawnPositions)) {
            var spawnAction = new PlayCardSilentlyAction(
              this.getGameSession(),
              this.getOwnerId(),
              spawnPosition.x,
              spawnPosition.y,
              { id: Cards.Tile.Shadow },
            );
            spawnAction.setSource(this);
            result.push(this.getGameSession().executeAction(spawnAction));
          }
          return result;
        })();
      }
    }
  }
}
SpellIntensifyShadowBlossom.prototype.spawnCount = 1;

module.exports = SpellIntensifyShadowBlossom;
