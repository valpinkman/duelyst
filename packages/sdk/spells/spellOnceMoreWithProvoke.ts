/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('@duelyst/common/logger');
const CONFIG = require('@duelyst/common/config');
const SpellSpawnEntity = require('./spellSpawnEntity');
const CardType = require('@duelyst/sdk/cards/cardType');
const Rarity = require('@duelyst/sdk/cards/rarityLookup');
const Cards = require('@duelyst/sdk/cards/cardsLookupComplete');
const DieAction = require('@duelyst/sdk/actions/dieAction');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const _ = require('underscore');
const ModifierProvoke = require('@duelyst/sdk/modifiers/modifierProvoke');

class SpellOnceMoreWithProvoke extends SpellSpawnEntity {
  declare targetType: any;
  declare spawnSilently: any;
  declare numUnits: any;
  declare cardDataOrIndexToSpawn: any;

  getPrivateDefaults(gameSession) {
    const p = super.getPrivateDefaults(gameSession);

    p.deadUnits = null;

    return p;
  }

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    // find a random dead entity
    const entities = this.getDeadUnits();
    // The index was wrapped in an array literal here and in the 2016 source,
    // which only worked by coercion: entities[[3]] is entities['3'], and
    // splice([3], 1) coerces the same way. Unwrapped -- identical behaviour,
    // minus the landmine.
    const whichEntity = this.getGameSession().getRandomIntegerForExecution(entities.length);
    const entityToSpawn = entities[whichEntity];
    if (entityToSpawn != null) {
      this.cardDataOrIndexToSpawn = entityToSpawn.createNewCardData();
      this._private.deadUnits.splice(whichEntity, 1); // remove this unit from the list of dead units (don't summon the same one twice)
      return super.onApplyEffectToBoardTile(board, x, y, sourceAction);
    }
  }

  _findApplyEffectPositions(position, sourceAction) {
    let applyEffectPositions;
    const card = this.getEntityToSpawn();
    const generalPosition = this.getGameSession().getGeneralForPlayerId(this.ownerId).getPosition();
    let numberOfApplyPositions = this.numUnits;
    if (numberOfApplyPositions > this.getDeadUnits().length) {
      numberOfApplyPositions = this.getDeadUnits().length;
    }

    if (numberOfApplyPositions > 0) {
      applyEffectPositions = UtilsGameSession.getRandomSmartSpawnPositionsFromPattern(
        this.getGameSession(),
        generalPosition,
        CONFIG.PATTERN_3x3,
        card,
        this,
        numberOfApplyPositions,
      );
    } else {
      applyEffectPositions = [];
    }

    return applyEffectPositions;
  }

  getAppliesSameEffectToMultipleTargets() {
    return true;
  }

  getDeadUnits() {
    if (this._private.deadUnits == null) {
      const unitsToAdd = [];
      const deadFriendlyUnits = this.getGameSession().getDeadUnits(this.getOwnerId());
      for (var unit of Array.from<any>(deadFriendlyUnits)) {
        if (unit.hasModifierClassInContextObjects(ModifierProvoke)) {
          unitsToAdd.push(unit);
        }
      }
      this._private.deadUnits = unitsToAdd;
    }
    return this._private.deadUnits;
  }

  // once more with provoke picks its apply locations by itself, so don't set limits on where it can be cast
  _postFilterPlayPositions(validPositions) {
    return validPositions;
  }
}
SpellOnceMoreWithProvoke.prototype.targetType = CardType.Unit;
SpellOnceMoreWithProvoke.prototype.spawnSilently = true;
SpellOnceMoreWithProvoke.prototype.numUnits = 8;
SpellOnceMoreWithProvoke.prototype.cardDataOrIndexToSpawn = { id: Cards.Faction4.Wraithling };

module.exports = SpellOnceMoreWithProvoke;
