/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsJavascript = require('app/common/utils/utils_javascript');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const UtilsPosition = require('app/common/utils/utils_position');
const CardType = require('app/sdk/cards/cardType');
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const PlayCardAction = require('app/sdk/actions/playCardAction');
const CloneEntityAsTransformAction = require('app/sdk/actions/cloneEntityAsTransformAction');
const ModifierOpponentSummonWatch = require('./modifierOpponentSummonWatch');
const ModifierSummonWatch = require('./modifierSummonWatch');
const Modifier = require('./modifier');

class ModifierOpponentSummonWatchSpawn1HealthClone extends ModifierOpponentSummonWatch {
  declare type: any;
  declare cardDataOrIndexToSpawn: any;
  declare fxResource: any;

  static type = 'ModifierOpponentSummonWatchSpawn1HealthClone';
  static modifierName = 'Opponent Summon Watch';
  static description =
    'Whenever an enemy summons a minion, summon a 1 health clone nearby your general';

  static createContextObject(spawnDescription, spawnCount, spawnPattern, spawnSilently, options) {
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
      spawnSilently = false;
    }
    const contextObject = super.createContextObject(options);
    contextObject.spawnDescription = spawnDescription;
    contextObject.spawnCount = spawnCount;
    contextObject.spawnPattern = spawnPattern;
    contextObject.spawnSilently = spawnSilently;

    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      let replaceText = '';
      if (
        UtilsPosition.getArraysOfPositionsAreEqual(
          modifierContextObject.spawnPattern,
          CONFIG.PATTERN_1x1,
        )
      ) {
        replaceText = `a ${modifierContextObject.spawnDescription} in the same space`;
      } else if (modifierContextObject.spawnCount === 1) {
        replaceText = `a ${modifierContextObject.spawnDescription} into a nearby space`;
      } else if (modifierContextObject.spawnCount === 8) {
        replaceText = `${modifierContextObject.spawnDescription}s in all nearby spaces`;
      } else {
        replaceText = `${modifierContextObject.spawnDescription}s into ${modifierContextObject.spawnCount} nearby spaces`;
      }
      return this.description.replace(/%X/, replaceText);
    }
    return this.description;
  }

  onSummonWatch(action?) {
    super.onSummonWatch(action);

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const summonedPosition = action.getTargetPosition();
      const ownerId = this.getSpawnOwnerId(action);
      const cloningEntity = this.getEntityToSpawn(summonedPosition.x, summonedPosition.y);
      if (cloningEntity != null) {
        this.cardDataOrIndexToSpawn = cloningEntity.createNewCardData();
        const spawnPositions =
          UtilsGameSession.getRandomNonConflictingSmartSpawnPositionsForModifier(
            this,
            ModifierOpponentSummonWatchSpawn1HealthClone,
          );
        return (() => {
          const result = [];
          for (var spawnPosition of Array.from<any>(spawnPositions)) {
            var spawnEntityAction = new CloneEntityAsTransformAction(
              this.getGameSession(),
              this.getOwnerId(),
              spawnPosition.x,
              spawnPosition.y,
            );
            spawnEntityAction.setOwnerId(this.getSpawnOwnerId(action));
            spawnEntityAction.setSource(cloningEntity);
            this.getGameSession().executeAction(spawnEntityAction);
            // make the clone 1 health
            var spawnedClone = spawnEntityAction.getCard();
            var set1Health = Modifier.createContextObjectWithRebasedAttributeBuffs(
              0,
              1,
              false,
              true,
            );
            set1Health.appliedName = 'Imperfect Clone';
            set1Health.appliedDescription = '1 Health';
            result.push(this.getGameSession().applyModifierContextObject(set1Health, spawnedClone));
          }
          return result;
        })();
      }
    }
  }

  getCardDataOrIndexToSpawn() {
    return this.cardDataOrIndexToSpawn;
  }

  getEntityToSpawn(x, y) {
    return this.getGameSession().getBoard().getUnitAtPosition({ x, y });
  }

  getSpawnOwnerId(action) {
    return this.getCard().getOwnerId();
  }

  getIsCardRelevantToWatcher(card) {
    return true;
  }
}
ModifierOpponentSummonWatchSpawn1HealthClone.prototype.type =
  'ModifierOpponentSummonWatchSpawn1HealthClone';
ModifierOpponentSummonWatchSpawn1HealthClone.prototype.cardDataOrIndexToSpawn = null;
ModifierOpponentSummonWatchSpawn1HealthClone.prototype.fxResource = [
  'FX.Modifiers.ModifierSummonWatch',
  'FX.Modifiers.ModifierGenericSpawn',
];
// default when no card restrictions are needed

module.exports = ModifierOpponentSummonWatchSpawn1HealthClone;
