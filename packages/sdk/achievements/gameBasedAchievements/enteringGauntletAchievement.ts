/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('@duelyst/sdk/achievements/achievement');
const GameType = require('@duelyst/sdk/gameType');
const i18next = require('i18next');

// Play your first 20 Season Ranked games.

class EnteringGauntletAchievement extends Achievement {
  declare static title: any;
  declare static description: any;

  static id = 'enteringGauntletAchievement';
  static progressRequired = 20;
  static rewards = { gauntletTicket: 1 };

  static progressForGameDataForPlayerId(gameData, playerId, isUnscored, isDraw) {
    if (gameData.gameType === GameType.Ranked && !isUnscored) {
      return 1;
    }
    return 0;
  }
}
EnteringGauntletAchievement.title = i18next.t('achievements.entering_gauntlet_title');
EnteringGauntletAchievement.description = i18next.t('achievements.entering_gauntlet_desc');

module.exports = EnteringGauntletAchievement;
