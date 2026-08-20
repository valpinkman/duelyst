/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const PlayCardAction = require('app/sdk/actions/playCardAction');
const Cards = require('app/sdk/cards/cardsLookupComplete');
const ModifierOnOpponentDeathWatch = require('./modifierOnOpponentDeathWatch');

class ModifierOnOpponentDeathWatchSpawnEntityOnSpace extends ModifierOnOpponentDeathWatch {
  declare type: any;
  declare cardDataOrIndexToSpawn: any;
  declare spawnCount: any;
  declare spawnSilently: any;
  declare spawnPattern: any;
  declare prisonerList: any;
  declare fxResource: any;

  static type = 'ModifierOnOpponentDeathWatchSpawnEntityOnSpace';
  static modifierName = 'Deathwatch';
  static description = 'Whenever an enemy minion dies, summon a %X';

  static createContextObject(
    cardDataOrIndexToSpawn,
    spawnDescription,
    spawnCount,
    spawnPattern,
    spawnSilently,
    options,
  ) {
    if (spawnDescription == null) {
      spawnDescription = 'prisoner';
    }
    if (spawnCount == null) {
      spawnCount = 1;
    }
    if (spawnPattern == null) {
      spawnPattern = CONFIG.PATTERN_1x1;
    }
    if (spawnSilently == null) {
      spawnSilently = true;
    }
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToSpawn = cardDataOrIndexToSpawn;
    contextObject.spawnDescription = spawnDescription;
    contextObject.spawnCount = spawnCount;
    contextObject.spawnPattern = spawnPattern;
    contextObject.spawnSilently = spawnSilently;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/, modifierContextObject.spawnDescription);
    }
    return this.description;
  }

  onDeathWatch(action) {
    super.onDeathWatch(action);

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      // if there's no defined card to summon, instead spawn a random prisoner
      if (
        this.cardDataOrIndexToSpawn == null ||
        Array.from<any>(this.prisonerList).includes(this.cardDataOrIndexToSpawn)
      ) {
        this.cardDataOrIndexToSpawn =
          this.prisonerList[
            this.getGameSession().getRandomIntegerForExecution(this.prisonerList.length)
          ];
      }

      const card = this.getGameSession().getExistingCardFromIndexOrCachedCardFromData(
        this.cardDataOrIndexToSpawn,
      );
      const spawnLocations = UtilsGameSession.getRandomSmartSpawnPositionsFromPattern(
        this.getGameSession(),
        action.getTargetPosition(),
        this.spawnPattern,
        card,
        this.getCard(),
        1,
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
          playCardAction.setSource(this.getCard());
          result.push(this.getGameSession().executeAction(playCardAction));
        }
        return result;
      })();
    }
  }

  getCardDataOrIndexToSpawn() {
    return this.cardDataOrIndexToSpawn;
  }

  getSpawnOwnerId(action) {
    return this.getCard().getOwnerId();
  }
}
ModifierOnOpponentDeathWatchSpawnEntityOnSpace.prototype.type =
  'ModifierOnOpponentDeathWatchSpawnEntityOnSpace';
ModifierOnOpponentDeathWatchSpawnEntityOnSpace.prototype.cardDataOrIndexToSpawn = null;
ModifierOnOpponentDeathWatchSpawnEntityOnSpace.prototype.spawnCount = 1;
ModifierOnOpponentDeathWatchSpawnEntityOnSpace.prototype.spawnSilently = true;
ModifierOnOpponentDeathWatchSpawnEntityOnSpace.prototype.spawnPattern = CONFIG.PATTERN_1x1;
ModifierOnOpponentDeathWatchSpawnEntityOnSpace.prototype.prisonerList = [
  { id: Cards.Neutral.Prisoner1 },
  { id: Cards.Neutral.Prisoner2 },
  { id: Cards.Neutral.Prisoner3 },
  { id: Cards.Neutral.Prisoner4 },
  { id: Cards.Neutral.Prisoner5 },
  { id: Cards.Neutral.Prisoner6 },
];
ModifierOnOpponentDeathWatchSpawnEntityOnSpace.prototype.fxResource = [
  'FX.Modifiers.ModifierDeathWatch',
  'FX.Modifiers.ModifierGenericSpawn',
];

module.exports = ModifierOnOpponentDeathWatchSpawnEntityOnSpace;
