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
const CardType = require('app/sdk/cards/cardType');
const Cards = require('app/sdk/cards/cardsLookupComplete');
const ModifierMyAttackOrAttackedWatch = require('./modifierMyAttackOrAttackedWatch');

class ModifierMyAttackOrAttackedWatchSpawnMinionNearby extends ModifierMyAttackOrAttackedWatch {
  declare type: any;
  declare fxResource: any;
  declare cardDataOrIndexToSpawn: any;

  static type = 'ModifierMyAttackOrAttackedWatchSpawnMinionNearby';
  static modifierName = 'Attack or Attacked Watch and Spawn Minion';
  static description = 'Whenever this minion attacks or is attacked, summon %X nearby';

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

  onMyAttackOrAttackedWatch(action) {
    super.onMyAttackOrAttackedWatch(action);

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const ownerId = this.getSpawnOwnerId(action);
      const spawnPositions = UtilsGameSession.getRandomNonConflictingSmartSpawnPositionsForModifier(
        this,
        ModifierMyAttackOrAttackedWatchSpawnMinionNearby,
      );
      return (() => {
        const result = [];
        for (var spawnPosition of Array.from<any>(spawnPositions)) {
          var spawnAction;
          var cardDataOrIndexToSpawn = this.getCardDataOrIndexToSpawn();
          if (this.spawnSilently) {
            spawnAction = new PlayCardSilentlyAction(
              this.getGameSession(),
              ownerId,
              spawnPosition.x,
              spawnPosition.y,
              cardDataOrIndexToSpawn,
            );
          } else {
            spawnAction = new PlayCardAction(
              this.getGameSession(),
              ownerId,
              spawnPosition.x,
              spawnPosition.y,
              cardDataOrIndexToSpawn,
            );
          }
          spawnAction.setSource(this.getCard());
          result.push(this.getGameSession().executeAction(spawnAction));
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
ModifierMyAttackOrAttackedWatchSpawnMinionNearby.prototype.type =
  'ModifierMyAttackOrAttackedWatchSpawnMinionNearby';
ModifierMyAttackOrAttackedWatchSpawnMinionNearby.prototype.fxResource = [
  'FX.Modifiers.ModifierGenericSpawn',
];
ModifierMyAttackOrAttackedWatchSpawnMinionNearby.prototype.cardDataOrIndexToSpawn = null;

module.exports = ModifierMyAttackOrAttackedWatchSpawnMinionNearby;
