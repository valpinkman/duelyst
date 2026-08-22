/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('@duelyst/sdk/achievements/achievement');
const GameType = require('@duelyst/sdk/gameType');
const CosmeticsLookup = require('@duelyst/sdk/cosmetics/cosmeticsLookup');
const CosmeticsTypeLookup = require('@duelyst/sdk/cosmetics/cosmeticsTypeLookup');
const _ = require('underscore');

class HomeTurfAchievement extends Achievement {
  declare static rewards: any;

  static id = 'homeTurf';
  static title = 'Home Turf';
  static description = "You've won 5 games as Player One. Enjoy a free Premium Battle Map on us!";
  static progressRequired = 5;
  static enabled = false;

  static progressForGameDataForPlayerId(gameData, playerId, isUnscored, isDraw) {
    if (isUnscored || !GameType.isFactionXPGameType(gameData.gameType)) {
      return 0;
    }

    if (gameData.players[0].playerId === playerId && gameData.players[0].isWinner) {
      return 1;
    }

    return 0;
  }
}
HomeTurfAchievement.rewards = {
  newRandomCosmetics: [{ type: CosmeticsTypeLookup.BattleMap }],
};

module.exports = HomeTurfAchievement;
