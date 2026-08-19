/*
 * Hand-converted (decaffeinate refused: `this` before `super` + a bound `=>`
 * class method). NOTE, faithfully preserved latent bug: the CoffeeScript
 * constructor read `@.factionId` BEFORE super, which can only see the
 * prototype default (null) - so the quest name was always built from
 * `factionForIdentifier(null)`, never the real faction. Kept identical
 * (prototype lookup) to avoid changing user-visible quest names.
 */
const Quest = require('./quest');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const GameType = require('app/sdk/gameType');
const FactionsLookup = require('app/sdk/cards/factionsLookup');
const FactionFactory = require('app/sdk/cards/factionFactory');
const i18next = require('i18next');

class QuestParticipationWithFaction extends Quest {
  constructor(id, typesIn, reward, factionId) {
    const faction = FactionFactory.factionForIdentifier(QuestParticipationWithFaction.prototype.factionId);
    const name = i18next.t('quests.quest_faction_games_title', { faction_name: faction.short_name });
    super(id, name, typesIn, reward);
    // CoffeeScript `=>` method: bound to the instance
    this.getFactionId = this.getFactionId.bind(this);
    this.factionId = factionId;
    this.params.factionId = this.factionId;
    this.params.completionProgress = 4;
  }

  _progressForGameDataForPlayerId(gameData, playerId) {
    for (const player of Array.from(gameData.players)) {
      const playerSetupData = UtilsGameSession.getPlayerSetupDataForPlayerId(gameData, player.playerId);
      if ((player.playerId === playerId) && (playerSetupData.factionId === this.getFactionId()) && GameType.isCompetitiveGameType(gameData.gameType)) {
        return 1;
      }
    }
    return 0;
  }

  getFactionId() {
    return this.factionId;
  }

  getDescription() {
    const faction = FactionFactory.factionForIdentifier(this.factionId);
    if (this.getFactionId() === FactionsLookup.Abyssian) {
      return i18next.t('quests.quest_faction_abyss_games_desc', { count: this.params.completionProgress, faction: faction.short_name });
    }
    return i18next.t('quests.quest_faction_games_desc', { count: this.params.completionProgress, faction: faction.short_name });
  }
}
QuestParticipationWithFaction.prototype.factionId = null;

module.exports = QuestParticipationWithFaction;
