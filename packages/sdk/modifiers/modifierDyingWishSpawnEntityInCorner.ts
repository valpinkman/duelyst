/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('@duelyst/common/config');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const PlayCardSilentlyAction = require('@duelyst/sdk/actions/playCardSilentlyAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierDyingWishSpawnEntityInCorner extends ModifierDyingWish {
  declare type: any;
  declare cardDataOrIndexToSpawn: any;
  declare fxResource: any;

  static type = 'ModifierDyingWishSpawnEntityInCorner';
  static description = 'Summon %X';

  static createContextObject(cardDataOrIndexToSpawn, spawnDescription, spawnCount, options) {
    if (spawnDescription == null) {
      spawnDescription = '';
    }
    if (spawnCount == null) {
      spawnCount = 1;
    }
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToSpawn = cardDataOrIndexToSpawn;
    contextObject.spawnDescription = spawnDescription;
    contextObject.spawnCount = spawnCount;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      if (modifierContextObject.spawnCount === 4) {
        return this.description.replace(
          /%X/,
          `${modifierContextObject.spawnDescription} in each unoccupied corner`,
        );
      }
      if (modifierContextObject.spawnCount === 1) {
        if (modifierContextObject.spawnDescription !== 'a copy of this minion') {
          return this.description.replace(
            /%X/,
            `${modifierContextObject.spawnDescription} in a random corner`,
          );
        }
        return 'Re-summon this minion in a random corner';
      }
      return this.description.replace(
        /%X/,
        `${modifierContextObject.spawnDescription} in ${modifierContextObject.spawnCount} random corners`,
      );
    }
    return this.description;
  }

  onDyingWish(action) {
    super.onDyingWish(action);

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const cornerSpawnPattern = [
        { x: 0, y: 0 },
        { x: 0, y: CONFIG.BOARDROW - 1 },
        { x: CONFIG.BOARDCOL - 1, y: 0 },
        { x: CONFIG.BOARDCOL - 1, y: CONFIG.BOARDROW - 1 },
      ];
      const card = this.getGameSession().getExistingCardFromIndexOrCachedCardFromData(
        this.cardDataOrIndexToSpawn,
      );
      const spawnLocations = UtilsGameSession.getRandomSmartSpawnPositionsFromPattern(
        this.getGameSession(),
        { x: 0, y: 0 },
        cornerSpawnPattern,
        card,
        this.getCard(),
        this.spawnCount,
      );

      return (() => {
        const result = [];
        for (var position of Array.from<any>(spawnLocations)) {
          var playCardAction = new PlayCardSilentlyAction(
            this.getGameSession(),
            this.getCard().getOwnerId(),
            position.x,
            position.y,
            this.cardDataOrIndexToSpawn,
          );
          playCardAction.setSource(this.getCard());
          result.push(this.getGameSession().executeAction(playCardAction));
        }
        return result;
      })();
    }
  }
}
ModifierDyingWishSpawnEntityInCorner.prototype.type = 'ModifierDyingWishSpawnEntityInCorner';
ModifierDyingWishSpawnEntityInCorner.prototype.cardDataOrIndexToSpawn = null;
ModifierDyingWishSpawnEntityInCorner.prototype.fxResource = [
  'FX.Modifiers.ModifierDyingWish',
  'FX.Modifiers.ModifierGenericSpawn',
];

module.exports = ModifierDyingWishSpawnEntityInCorner;
