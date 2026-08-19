/*
 * Hand-converted (decaffeinate refused: `this` before `super` + a bound `=>`
 * class method).
 *
 * A previous version of this file read the faction from
 * `QuestParticipationWithFaction.prototype.factionId` and described that as a
 * latent bug preserved from the CoffeeScript. It was not: the original was
 *
 *     constructor:(id,typesIn,reward,@factionId)->
 *       faction = FactionFactory.factionForIdentifier(@.factionId)
 *
 * where `@factionId` in the PARAMETER LIST assigns `this.factionId` at the top
 * of the constructor. CoffeeScript 1.x compiled `super` to a plain
 * `__super__.constructor.call(this)`, so `this` was usable before it and the
 * read saw the real faction id. ES6 classes forbid `this` before `super()`,
 * and the conversion reached for the prototype default instead - which is
 * always null.
 *
 * That was not a cosmetic difference. `factionForIdentifier(null)` returns
 * `console.error(...)`, i.e. undefined, so `faction.short_name` threw a
 * TypeError - and because `QuestFactory._generateQuestCache` builds these in
 * an unguarded loop as its FIRST step, the throw killed the entire quest
 * cache. No participation quests, no win quests, no daily quests.
 *
 * The parameter is used directly now, which is what the CoffeeScript did.
 */
const Quest = require('./quest');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const GameType = require('app/sdk/gameType');
const FactionsLookup = require('app/sdk/cards/factionsLookup');
const FactionFactory = require('app/sdk/cards/factionFactory');
const i18next = require('i18next');

class QuestParticipationWithFaction extends Quest {
  declare factionId: any;

  constructor(id, typesIn, reward, factionId) {
    const faction = FactionFactory.factionForIdentifier(factionId);
    const name = i18next.t('quests.quest_faction_games_title', { faction_name: faction.short_name });
    super(id, name, typesIn, reward);
    // CoffeeScript `=>` method: bound to the instance
    this.getFactionId = this.getFactionId.bind(this);
    this.factionId = factionId;
    this.params.factionId = this.factionId;
    this.params.completionProgress = 4;
  }

  _progressForGameDataForPlayerId(gameData, playerId) {
    for (const player of Array.from<any>(gameData.players)) {
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
