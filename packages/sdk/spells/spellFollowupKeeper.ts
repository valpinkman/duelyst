/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const SpellSpawnEntity = require('./spellSpawnEntity');
const DieAction = require('@duelyst/sdk/actions/dieAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const Cards = require('@duelyst/sdk/cards/cardsLookupComplete');
const Rarity = require('@duelyst/sdk/cards/rarityLookup');

class SpellFollowupKeeper extends SpellSpawnEntity {
  declare canBeAppliedAnywhere: any;
  declare spawnSilently: any;
  declare cardDataOrIndexToSpawn: any;

  getPrivateDefaults(gameSession) {
    const p = super.getPrivateDefaults(gameSession);

    p.followupSourcePattern = CONFIG.PATTERN_3x3; // only allow spawns within a 3x3 area of source position
    p.deadUnits = null;

    return p;
  }

  getDeadUnits() {
    if (this._private.deadUnits == null) {
      this._private.deadUnits = this.getGameSession().getDeadUnits(this.getOwnerId());
    }
    return this._private.deadUnits;
  }

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    const entities = this.getDeadUnits();
    // find and spawn a dead unit
    if (entities.length > 0) {
      const entityToSpawn =
        entities[this.getGameSession().getRandomIntegerForExecution(entities.length)];
      if (entityToSpawn != null) {
        this.cardDataOrIndexToSpawn = entityToSpawn.createNewCardData();
        return super.onApplyEffectToBoardTile(board, x, y, sourceAction);
      }
    }
  }

  _postFilterPlayPositions(validPositions) {
    // don't allow followup if there's nothing to re-summon
    if (this.getDeadUnits().length > 0) {
      return super._postFilterPlayPositions(validPositions);
    }
    return [];
  }
}
SpellFollowupKeeper.prototype.canBeAppliedAnywhere = false;
SpellFollowupKeeper.prototype.spawnSilently = true;
SpellFollowupKeeper.prototype.cardDataOrIndexToSpawn = { id: Cards.Neutral.KeeperOfTheVale };

module.exports = SpellFollowupKeeper;
