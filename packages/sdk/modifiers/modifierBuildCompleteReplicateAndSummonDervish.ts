/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('@duelyst/common/config');
const Cards = require('@duelyst/sdk/cards/cardsLookupComplete');
const PlayCardSilentlyAction = require('@duelyst/sdk/actions/playCardSilentlyAction');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const ModifierBuilding = require('./modifierBuilding');

class ModifierBuildCompleteReplicateAndSummonDervish extends ModifierBuilding {
  declare type: any;
  declare buildingMinion: any;

  static type = 'ModifierBuildCompleteReplicateAndSummonDervish';

  onBuildComplete() {
    super.onBuildComplete(); // finish build

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      // and create another replicator obelysk
      const card = this.getGameSession().getExistingCardFromIndexOrCachedCardFromData(
        this.buildingMinion,
      );
      const spawnPositions = UtilsGameSession.getSmartSpawnPositionsFromPattern(
        this.getGameSession(),
        this.getCard().getPosition(),
        CONFIG.PATTERN_3x3,
        card,
      );
      if ((spawnPositions != null ? spawnPositions.length : undefined) > 0) {
        const obelyskSpawnPosition = spawnPositions.splice(
          this.getGameSession().getRandomIntegerForExecution(spawnPositions.length),
          1,
        )[0];
        const cardDataOrIndexToSpawn = this.buildingMinion;
        const buildingModifier = ModifierBuildCompleteReplicateAndSummonDervish.createContextObject(
          this.description,
          { id: Cards.Faction3.SimulacraObelysk },
          2,
        );
        buildingModifier.buildingMinion = { id: Cards.Faction3.SimulacraBuilding };
        if (cardDataOrIndexToSpawn.additionalInherentModifiersContextObjects == null) {
          cardDataOrIndexToSpawn.additionalInherentModifiersContextObjects = [];
        }
        cardDataOrIndexToSpawn.additionalInherentModifiersContextObjects.push(buildingModifier);
        const spawnAction1 = new PlayCardSilentlyAction(
          this.getGameSession(),
          this.getCard().getOwnerId(),
          obelyskSpawnPosition.x,
          obelyskSpawnPosition.y,
          cardDataOrIndexToSpawn,
        );
        spawnAction1.setSource(this.getCard());
        this.getGameSession().executeAction(spawnAction1);
      }

      // and summon a dervish
      if ((spawnPositions != null ? spawnPositions.length : undefined) > 0) {
        const dervish = this.getGameSession().getExistingCardFromIndexOrCachedCardFromData({
          id: Cards.Faction3.Dervish,
        });
        const dervishSpawnPosition =
          spawnPositions[this.getGameSession().getRandomIntegerForExecution(spawnPositions.length)];
        const spawnAction2 = new PlayCardSilentlyAction(
          this.getGameSession(),
          this.getCard().getOwnerId(),
          dervishSpawnPosition.x,
          dervishSpawnPosition.y,
          { id: Cards.Faction3.Dervish },
        );
        spawnAction2.setSource(this.getCard());
        return this.getGameSession().executeAction(spawnAction2);
      }
    }
  }
}
ModifierBuildCompleteReplicateAndSummonDervish.prototype.type =
  'ModifierBuildCompleteReplicateAndSummonDervish';
ModifierBuildCompleteReplicateAndSummonDervish.prototype.buildingMinion = null;

module.exports = ModifierBuildCompleteReplicateAndSummonDervish;
