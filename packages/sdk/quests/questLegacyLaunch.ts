/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Quest = require('./quest');
const GameStatus = require('@duelyst/sdk/gameStatus');
const GameType = require('@duelyst/sdk/gameType');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const GiftCrateLookup = require('@duelyst/sdk/giftCrates/giftCrateLookup');
const QuestType = require('./questTypeLookup');
const moment = require('moment');

class QuestLegacyLaunch extends Quest {
  declare isReplaceable: any;
  declare giftChests: any;
  declare rewardDetails: any;

  static Identifier = 40003;

  constructor() {
    super(QuestLegacyLaunch.Identifier, 'Unlimited Celebration', [QuestType.Promotional]);
    this.params.completionProgress = 7;
  }

  _progressForGameDataForPlayerId(gameData, playerId) {
    for (var player of Array.from<any>(gameData.players)) {
      var playerSetupData = UtilsGameSession.getPlayerSetupDataForPlayerId(
        gameData,
        player.playerId,
      );
      if (gameData.gameType === GameType.Casual) {
        return 1;
      }
    }
    return 0;
  }

  getDescription() {
    return `Play ${this.params.completionProgress} Unlimited Mode matches before April 30th UTC`;
  }

  isAvailableOn(momentUtc) {
    return (
      momentUtc.isAfter(moment.utc('2018-03-14')) && momentUtc.isBefore(moment.utc('2018-04-30'))
    );
  }

  expiresOn() {
    return moment.utc('2018-03-14');
  }
}
QuestLegacyLaunch.prototype.isReplaceable = false;
QuestLegacyLaunch.prototype.giftChests = [GiftCrateLookup.LegacyLaunch];
QuestLegacyLaunch.prototype.rewardDetails = 'Unlimited Mode Celebration Crate';

module.exports = QuestLegacyLaunch;
