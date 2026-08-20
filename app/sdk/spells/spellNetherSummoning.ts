/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const CONFIG = require('app/common/config');
const SpellSpawnEntity = require('./spellSpawnEntity');
const CardType = require('app/sdk/cards/cardType');
const Rarity = require('app/sdk/cards/rarityLookup');
const Cards = require('app/sdk/cards/cardsLookupComplete');
const DieAction = require('app/sdk/actions/dieAction');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const _ = require('underscore');

class SpellNetherSummoning extends SpellSpawnEntity {
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
    const whichEntity = [this.getGameSession().getRandomIntegerForExecution(entities.length)];
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
      this._private.deadUnits = this.getGameSession().getDeadUnits(null, this.getOwnerId());
    }
    return this._private.deadUnits;
  }

  // nether summmoning picks its apply locations by itself, so don't set limits on where it can be cast
  _postFilterPlayPositions(validPositions) {
    return validPositions;
  }
}
SpellNetherSummoning.prototype.targetType = CardType.Unit;
SpellNetherSummoning.prototype.spawnSilently = true;
SpellNetherSummoning.prototype.numUnits = 2;
SpellNetherSummoning.prototype.cardDataOrIndexToSpawn = { id: Cards.Faction4.Wraithling };

module.exports = SpellNetherSummoning;
