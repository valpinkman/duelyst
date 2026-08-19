/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('app/sdk/achievements/achievement');
const GameType = require('app/sdk/gameType');
const i18next = require('i18next');

// Play your first game with a Friend.

class BestOfFriendsAchievement extends Achievement {
  declare static title: any;
  declare static description: any;

  static id = 'bestOfFriends';
  static progressRequired = 1;
  static rewards = { spiritOrb: 1 };

  static progressForGameDataForPlayerId(gameData, playerId, isUnscored, isDraw) {
    if (gameData.gameType === GameType.Friendly) {
      return 1;
    }
    return 0;
  }
}
BestOfFriendsAchievement.title = i18next.t('achievements.best_of_friends_title');
BestOfFriendsAchievement.description = i18next.t('achievements.best_of_friends_desc');

module.exports = BestOfFriendsAchievement;
