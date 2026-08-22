/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const PlayCardSilentlyAction = require('@duelyst/sdk/actions/playCardSilentlyAction');
const Cards = require('@duelyst/sdk/cards/cardsLookupComplete');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitSpawnPartyAnimals extends ModifierOpeningGambit {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitSpawnPartyAnimals';

  onOpeningGambit() {
    super.onOpeningGambit();

    const possibleAnimals = [
      { id: Cards.Neutral.PartyAnimal1 },
      { id: Cards.Neutral.PartyAnimal2 },
      { id: Cards.Neutral.PartyAnimal3 },
      { id: Cards.Neutral.PartyAnimal4 },
    ];

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const animalToSpawn = possibleAnimals.splice(
        this.getGameSession().getRandomIntegerForExecution(possibleAnimals.length),
        1,
      )[0];
      const animalCard =
        this.getGameSession().getExistingCardFromIndexOrCachedCardFromData(animalToSpawn);
      const ownerId = this.getOwnerId();
      const validSpawnLocations = UtilsGameSession.getRandomSmartSpawnPositionsFromPattern(
        this.getGameSession(),
        this.getGameSession().getGeneralForPlayerId(ownerId).getPosition(),
        CONFIG.PATTERN_3x3,
        animalCard,
        this.getCard(),
        8,
      );
      this.summonAnimals(animalToSpawn, ownerId, validSpawnLocations);

      const enemyAnimalToSpawn = possibleAnimals.splice(
        this.getGameSession().getRandomIntegerForExecution(possibleAnimals.length),
        1,
      )[0];
      const enemyAnimalCard =
        this.getGameSession().getExistingCardFromIndexOrCachedCardFromData(enemyAnimalToSpawn);
      const opponentId = this.getGameSession()
        .getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId())
        .getOwnerId();
      const enemyValidSpawnLocations = UtilsGameSession.getRandomSmartSpawnPositionsFromPattern(
        this.getGameSession(),
        this.getGameSession()
          .getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId())
          .getPosition(),
        CONFIG.PATTERN_3x3,
        enemyAnimalCard,
        this.getCard(),
        8,
      );
      return this.summonAnimals(enemyAnimalToSpawn, opponentId, enemyValidSpawnLocations);
    }
  }

  summonAnimals(animal, playerId, validSpawnLocations) {
    const spawnLocations = [];

    for (let i = 0; i < 3; i++) {
      if (validSpawnLocations.length > 0) {
        spawnLocations.push(
          validSpawnLocations.splice(
            this.getGameSession().getRandomIntegerForExecution(validSpawnLocations.length),
            1,
          )[0],
        );
      }
    }

    return (() => {
      const result = [];
      for (var position of Array.from<any>(spawnLocations)) {
        var playCardAction = new PlayCardSilentlyAction(
          this.getGameSession(),
          playerId,
          position.x,
          position.y,
          animal,
        );
        playCardAction.setSource(this.getCard());
        result.push(this.getGameSession().executeAction(playCardAction));
      }
      return result;
    })();
  }
}
ModifierOpeningGambitSpawnPartyAnimals.prototype.type = 'ModifierOpeningGambitSpawnPartyAnimals';
ModifierOpeningGambitSpawnPartyAnimals.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
  'FX.Modifiers.ModifierGenericSpawn',
];

module.exports = ModifierOpeningGambitSpawnPartyAnimals;
