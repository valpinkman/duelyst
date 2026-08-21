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
const DieAction = require('app/sdk/actions/dieAction');
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const PlayCardAction = require('app/sdk/actions/playCardAction');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierDyingWishSpawnEntityNearbyGeneral extends ModifierDyingWish {
  declare type: any;
  declare fxResource: any;
  declare cardDataOrIndexToSpawn: any;

  static type = 'ModifierDyingWishSpawnEntityNearbyGeneral';
  static modifierName = 'Dying Wish';
  static description = 'Summon %X nearby your General';

  static createContextObject(
    cardDataOrIndexToSpawn,
    spawnDescription,
    spawnCount,
    spawnPattern,
    spawnSilently,
    options,
  ) {
    if (spawnDescription == null) {
      spawnDescription = '';
    }
    if (spawnCount == null) {
      spawnCount = 1;
    }
    if (spawnPattern == null) {
      spawnPattern = CONFIG.PATTERN_3x3;
    }
    if (spawnSilently == null) {
      spawnSilently = true;
    }
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToSpawn = cardDataOrIndexToSpawn;
    contextObject.spawnDescription = spawnDescription;
    contextObject.spawnPattern = spawnPattern;
    contextObject.spawnCount = spawnCount;
    contextObject.spawnSilently = spawnSilently;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/, modifierContextObject.spawnDescription);
    }
    return this.description;
  }

  onDyingWish(action) {
    super.onDyingWish(action);

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const card = this.getGameSession().getExistingCardFromIndexOrCachedCardFromData(
        this.cardDataOrIndexToSpawn,
      );
      const generalPosition = this.getGameSession()
        .getGeneralForPlayerId(this.getCard().getOwnerId())
        .getPosition();
      const spawnLocations = UtilsGameSession.getRandomSmartSpawnPositionsFromPattern(
        this.getGameSession(),
        generalPosition,
        this.spawnPattern,
        card,
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
              this.cardDataOrIndexToSpawn,
            );
          } else {
            playCardAction = new PlayCardSilentlyAction(
              this.getGameSession(),
              this.getCard().getOwnerId(),
              position.x,
              position.y,
              this.cardDataOrIndexToSpawn,
            );
          }
          playCardAction.sourcePosition = this.getCard().getPosition();
          result.push(this.getGameSession().executeAction(playCardAction));
        }
        return result;
      })();
    }
  }
}
ModifierDyingWishSpawnEntityNearbyGeneral.prototype.type =
  'ModifierDyingWishSpawnEntityNearbyGeneral';
ModifierDyingWishSpawnEntityNearbyGeneral.prototype.fxResource = [
  'FX.Modifiers.ModifierDyingWish',
  'FX.Modifiers.ModifierGenericSpawn',
];
ModifierDyingWishSpawnEntityNearbyGeneral.prototype.cardDataOrIndexToSpawn = null;

module.exports = ModifierDyingWishSpawnEntityNearbyGeneral;
