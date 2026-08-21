/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsGameSession = require('app/sdk/utils/utils_game_session');
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const PlayCardAction = require('app/sdk/actions/playCardAction');
const UtilsPosition = require('app/common/utils/utils_position');
const _ = require('underscore');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierDyingWishReSpawnEntityAnywhere extends ModifierDyingWish {
  declare type: any;
  declare fxResource: any;
  declare spawnCount: any;
  declare spawnSilently: any;

  static type = 'ModifierDyingWishReSpawnEntityAnywhere';

  static createContextObject(spawnCount, spawnSilently, options) {
    if (spawnCount == null) {
      spawnCount = 1;
    }
    if (spawnSilently == null) {
      spawnSilently = true;
    }
    const contextObject = super.createContextObject(options);
    contextObject.spawnCount = spawnCount;
    contextObject.spawnSilently = spawnSilently;
    return contextObject;
  }

  onDyingWish(action) {
    super.onDyingWish(action);

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const wholeBoardPattern = CONFIG.ALL_BOARD_POSITIONS;
      const cardData = this.getCard().createNewCardData();
      const thisEntityPosition = this.getCard().getPosition();
      const validPositions = _.reject(wholeBoardPattern, (position) =>
        UtilsPosition.getPositionsAreEqual(position, thisEntityPosition),
      );
      const spawnLocations = UtilsGameSession.getRandomSmartSpawnPositionsFromPattern(
        this.getGameSession(),
        { x: 0, y: 0 },
        validPositions,
        this.getCard(),
        this.getCard(),
        this.spawnCount,
      );

      return (() => {
        const result = [];
        for (var position of Array.from<any>(spawnLocations)) {
          var playCardAction;
          if (!this.spawnSilently) {
            playCardAction = new PlayCardAction(
              this.getGameSession(),
              this.getCard().getOwnerId(),
              position.x,
              position.y,
              cardData,
            );
          } else {
            playCardAction = new PlayCardSilentlyAction(
              this.getGameSession(),
              this.getCard().getOwnerId(),
              position.x,
              position.y,
              cardData,
            );
          }
          playCardAction.setSource(this.getCard());
          result.push(this.getGameSession().executeAction(playCardAction));
        }
        return result;
      })();
    }
  }
}
ModifierDyingWishReSpawnEntityAnywhere.prototype.type = 'ModifierDyingWishReSpawnEntityAnywhere';
ModifierDyingWishReSpawnEntityAnywhere.prototype.fxResource = [
  'FX.Modifiers.ModifierDyingWish',
  'FX.Modifiers.ModifierGenericSpawn',
];
ModifierDyingWishReSpawnEntityAnywhere.prototype.spawnCount = 1;
ModifierDyingWishReSpawnEntityAnywhere.prototype.spawnSilently = true;

module.exports = ModifierDyingWishReSpawnEntityAnywhere;
