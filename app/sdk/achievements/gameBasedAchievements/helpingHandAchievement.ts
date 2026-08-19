/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('app/sdk/achievements/achievement');
const GameType = require('app/sdk/gameType');
const i18next = require('i18next');

// Given when a player loses 3 games

class HelpingHandAchievement extends Achievement {
  declare static title: any;
  declare static description: any;

  static id = 'helpingHand';
  static progressRequired = 10;
  static rewards = { gold: 100 };

  static progressForGameDataForPlayerId(gameData, playerId, isUnscored, isDraw) {
    if (isUnscored || !GameType.isFactionXPGameType(gameData.gameType)) {
      return 0;
    }

    for (var player of Array.from<any>(gameData.players)) {
      if (player.playerId === playerId) {
        return 1;
      }
    }

    return 0;
  }
}
HelpingHandAchievement.title = i18next.t('achievements.helping_hand_title');
HelpingHandAchievement.description = i18next.t('achievements.helping_hand_desc');

module.exports = HelpingHandAchievement;
