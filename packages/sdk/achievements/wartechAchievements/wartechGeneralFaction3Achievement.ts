/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');

const Achievement = require('@duelyst/sdk/achievements/achievement');
const GameType = require('@duelyst/sdk/gameType');
const Cards = require('@duelyst/sdk/cards/cardsLookupComplete');
const Factions = require('@duelyst/sdk/cards/factionsLookup');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');

// Play your first 20 Season Ranked games.

class WartechGeneralFaction3Achievement extends Achievement {
  declare static title: any;
  declare static description: any;
  declare static rewards: any;

  static id = 'wartechGeneralFaction3Achievement';
  static progressRequired = 10;
  static tracksProgress = true;

  static progressForGameDataForPlayerId(gameData, playerId, isUnscored, isDraw) {
    if (!GameType.isCompetitiveGameType(gameData.gameType)) {
      return 0;
    }

    if (isUnscored) {
      return 0;
    }

    const playerSetupData = UtilsGameSession.getPlayerSetupDataForPlayerId(gameData, playerId);
    const playerFactionId = playerSetupData.factionId;
    if (playerFactionId !== Factions.Faction3) {
      return 0;
    }

    if (UtilsGameSession.getWinningPlayerId(gameData) !== playerId) {
      return 0;
    }

    // If the above all are passed 1 progress made
    return 1;
  }

  static progressForArmoryTransaction(armoryTransactionSku) {
    if (armoryTransactionSku.indexOf('WARTECH_PREORDER_35') !== -1) {
      return 10;
    }
    return 0;
  }

  static rewardUnlockMessage(progressMade) {
    if (progressMade == null) {
      progressMade = 0;
    }

    const progressNeeded = Math.max(this.progressRequired - progressMade, 0);

    return `Win ${progressNeeded} more online matches with Vetruvian to unlock.`;
  }
}
WartechGeneralFaction3Achievement.title = i18next.t(
  'achievements.wartech_general_achievement_title',
  { faction_name: i18next.t('factions.faction_3_abbreviated_name') },
);
WartechGeneralFaction3Achievement.description = i18next.t(
  'achievements.wartech_general_achievement_desc',
  { faction_name: i18next.t('factions.faction_3_abbreviated_name') },
);
WartechGeneralFaction3Achievement.rewards = {
  cards: [Cards.Faction3.ThirdGeneral],
};

module.exports = WartechGeneralFaction3Achievement;
