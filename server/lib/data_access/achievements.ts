/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS202: Simplify dynamic range loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const util = require('util');
const FirebasePromises = require('../firebase_promises');
const DuelystFirebase = require('../duelyst_firebase_module');
const Logger = require('../../../app/common/logger');
const colors = require('colors');
const moment = require('moment');
const _ = require('underscore');
const Helpers = require('./helpers');
const SyncModule = require('./sync');
const InventoryModule = require('./inventory');
const CosmeticChestsModule = require('./cosmetic_chests');
const GiftCrateModule = require('./gift_crate');
const CONFIG = require('../../../app/common/config');
const Errors = require('../custom_errors');
const knex = require('./knex');
const config = require('../../../config/config.js');
const generatePushId = require('../../../app/common/generate_push_id');

// SDK imports
const SDK = require('../../../app/sdk');
const CardFactory = require('../../../app/sdk/cards/cardFactory');
const Rarity = require('../../../app/sdk/cards/rarityLookup');
const Faction = require('../../../app/sdk/cards/factionsLookup');
const GameSession = require('../../../app/sdk/gameSession');
const UtilsGameSession = require('../../../app/common/utils/utils_game_session');
const QuestFactory = require('../../../app/sdk/quests/questFactory');
const QuestType = require('../../../app/sdk/quests/questTypeLookup');
const CosmeticsFactory = require('../../../app/sdk/cosmetics/cosmeticsFactory');
const PromiseUtils = require('../../../app/common/utils/utils_promise');
const { onType } = require('../../../app/common/utils/utils_promise');

class AchievementsModule {
  /**
   * Mark an achievement as read.
   * @public
   * @param  {String}    userId      User ID.
   * @param  {String}    achievementId  Achievement ID.
   * @return  {Promise}
   */
  static markAchievementAsRead(userId, achievementId) {
    const MOMENT_NOW_UTC = moment().utc();
    Logger.module('UsersModule').time(`markAchievementAsRead() -> user ${userId.blue} read achievement type ${achievementId}.`);
    const txPromise = knex.transaction(function (tx) {
      knex('user_achievements').where({ user_id: userId, achievement_id: achievementId }).update({ is_unread: false }).transacting(tx)
        .then(function (updateCount) {
          if (updateCount > 0) {
            return updateCount;
          } else {
            throw new Errors.NotFoundError('Cound not find achievement to mark as read for user');
          }
        })
        .then(() => DuelystFirebase.connect().getRootRef())
        .then((rootRef) => FirebasePromises.update(rootRef.child('user-achievements').child(userId).child('completed').child(achievementId), { is_unread: false }))
        .then(tx.commit)
        .catch(tx.rollback);
    });
    return txPromise;
  }

  //  resolves to an array of ids for newly completed achievements
  static updateAchievementsProgressWithGame(userId, gameId, gameData, isUnscored, isDraw) {
    Logger.module('AchievementsModule').debug(`updateAchievementsProgressWithGame() -> Updating game achievement progress for ${userId.blue}`.green);
    let progressMade = false;
    const progressMap = {};
    const enabledAchievements = SDK.AchievementsFactory.getEnabledAchievementsMap();
    for (var achievementId in enabledAchievements) {
      var achievement = enabledAchievements[achievementId];
      var achievementProgress = achievement.progressForGameDataForPlayerId(gameData, userId, isUnscored);
      if (achievementProgress) {
        progressMap[achievementId] = achievementProgress;
        progressMade = true;
      }
    }

    if (!progressMade) {
      Logger.module('AchievementsModule').debug(`updateAchievementsProgressWithGame() -> No game achievement progress made for ${userId.blue}`.green);
      return Promise.resolve([]);
    } else {
      return this._applyAchievementProgressMapToUser(userId, progressMap, gameId);
    }
  }

  static updateAchievementsProgressWithCardCollection(userId, cardCollection) {
    Logger.module('AchievementsModule').debug(`updateAchievementsProgressWithCardCollection() -> Updating card collection achievement progress for ${userId.blue}`.green);
    // TODO: if no data passed in, retrieve it

    let progressMade = false;
    const progressMap = {};
    const enabledAchievements = SDK.AchievementsFactory.getEnabledAchievementsMap();
    const allCards = SDK.GameSession.getCardCaches().getCards();
    for (var achievementId in enabledAchievements) {
      var achievement = enabledAchievements[achievementId];
      var achievementProgress = achievement.progressForCardCollection(cardCollection, allCards);
      if (achievementProgress) {
        progressMap[achievementId] = achievementProgress;
        progressMade = true;
      }
    }

    if (!progressMade) {
      return Promise.resolve([]);
    } else {
      return this._applyAchievementProgressMapToUser(userId, progressMap);
    }
  }

  static updateAchievementsProgressWithArmoryPurchase(userId, armoryTransactionSku) {
    Logger.module('AchievementsModule').debug(`updateAchievementsProgressWithArmoryPurchase() -> Updating armory achievement progress for ${userId.blue}`.green);
    let progressMade = false;
    const progressMap = {};
    const enabledAchievements = SDK.AchievementsFactory.getEnabledAchievementsMap();
    for (var achievementId in enabledAchievements) {
      var achievement = enabledAchievements[achievementId];
      var achievementProgress = achievement.progressForArmoryTransaction(armoryTransactionSku);
      if (achievementProgress) {
        progressMap[achievementId] = achievementProgress;
        progressMade = true;
      }
    }

    if (!progressMade) {
      return Promise.resolve([]);
    } else {
      return this._applyAchievementProgressMapToUser(userId, progressMap);
    }
  }

  static updateAchievementsProgressWithReferralEvent(userId, eventType) {
    Logger.module('AchievementsModule').debug(`updateAchievementsProgressWithReferralEvent() -> Updating achievement progress for ${userId.blue}`);
    let progressMade = false;
    const progressMap = {};
    const enabledAchievements = SDK.AchievementsFactory.getEnabledAchievementsMap();
    for (var achievementId in enabledAchievements) {
      var achievement = enabledAchievements[achievementId];
      var achievementProgress = achievement.progressForReferralEvent(eventType);
      if (achievementProgress) {
        progressMap[achievementId] = achievementProgress;
        progressMade = true;
      }
    }

    if (!progressMade) {
      return Promise.resolve([]);
    } else {
      return this._applyAchievementProgressMapToUser(userId, progressMap);
    }
  }

  static updateAchievementsProgressWithCraftedCard(userId, craftedCardId) {
    Logger.module('AchievementsModule').debug(`updateAchievementsProgressWithCraftedCard() -> Updating crafting achievement progress for ${userId.blue}`.green);
    let progressMade = false;
    const progressMap = {};
    const enabledAchievements = SDK.AchievementsFactory.getEnabledAchievementsMap();
    for (var achievementId in enabledAchievements) {
      var achievement = enabledAchievements[achievementId];
      var achievementProgress = achievement.progressForCrafting(craftedCardId);
      if (achievementProgress) {
        progressMap[achievementId] = achievementProgress;
        progressMade = true;
      }
    }

    if (!progressMade) {
      return Promise.resolve([]);
    } else {
      return this._applyAchievementProgressMapToUser(userId, progressMap);
    }
  }

  static updateAchievementsProgressWithFactionProgression(userId, factionProgressionData) {
    Logger.module('AchievementsModule').debug(`updateAchievementsProgressWithFactionProgression() -> Updating faction achievement progress for ${userId.blue}`.green);
    let progressMade = false;
    const progressMap = {};
    const enabledAchievements = SDK.AchievementsFactory.getEnabledAchievementsMap();
    for (var achievementId in enabledAchievements) {
      var achievement = enabledAchievements[achievementId];
      var achievementProgress = achievement.progressForFactionProgression(factionProgressionData);
      if (achievementProgress) {
        progressMap[achievementId] = achievementProgress;
        progressMade = true;
      }
    }

    if (!progressMade) {
      return Promise.resolve([]);
    } else {
      return this._applyAchievementProgressMapToUser(userId, progressMap);
    }
  }

  static updateAchievementsProgressWithDisenchantedCard(userId, disenchantedCardId) {
    Logger.module('AchievementsModule').debug(`updateAchievementsProgressWithDisenchantedCard() -> Updating disenchant achievement progress for ${userId.blue}`.green);
    let progressMade = false;
    const progressMap = {};
    const enabledAchievements = SDK.AchievementsFactory.getEnabledAchievementsMap();
    for (var achievementId in enabledAchievements) {
      var achievement = enabledAchievements[achievementId];
      var achievementProgress = achievement.progressForDisenchanting(disenchantedCardId);
      if (achievementProgress) {
        progressMap[achievementId] = achievementProgress;
        progressMade = true;
      }
    }

    if (!progressMade) {
      return Promise.resolve([]);
    } else {
      return this._applyAchievementProgressMapToUser(userId, progressMap);
    }
  }

  static updateAchievementsProgressWithCompletedQuest(userId, completedQuestId) {
    if (_.contains(QuestFactory.questForIdentifier(completedQuestId).types, QuestType.QuestBeginner)) {
      Logger.module('AchievementsModule').debug(`updateAchievementsProgressWithCompletedQuest() -> Skipping due to ${completedQuestId} is beginner for ${userId.blue}`.green);
      return Promise.resolve();
    }

    Logger.module('AchievementsModule').debug(`updateAchievementsProgressWithCompletedQuest() -> Updating quest ${completedQuestId} achievement progress for ${userId.blue}`.green);

    let progressMade = false;
    const progressMap = {};
    const enabledAchievements = SDK.AchievementsFactory.getEnabledAchievementsMap();
    for (var achievementId in enabledAchievements) {
      var achievement = enabledAchievements[achievementId];
      var achievementProgress = achievement.progressForCompletingQuestId(completedQuestId);
      if (achievementProgress) {
        progressMap[achievementId] = achievementProgress;
        progressMade = true;
      }
    }

    if (!progressMade) {
      return Promise.resolve([]);
    } else {
      return this._applyAchievementProgressMapToUser(userId, progressMap);
    }
  }

  static updateAchievementsProgressWithEarnedRank(userId, earnedRank) {
    Logger.module('AchievementsModule').debug(`updateAchievementsProgressWithEarnedRank() -> Updating rank achievement progress for ${userId.blue}`.green);
    let progressMade = false;
    const progressMap = {};
    const enabledAchievements = SDK.AchievementsFactory.getEnabledAchievementsMap();
    for (var achievementId in enabledAchievements) {
      var achievement = enabledAchievements[achievementId];
      var achievementProgress = achievement.progressForAchievingRank(earnedRank);
      if (achievementProgress) {
        progressMap[achievementId] = achievementProgress;
        progressMade = true;
      }
    }

    if (!progressMade) {
      return Promise.resolve([]);
    } else {
      return this._applyAchievementProgressMapToUser(userId, progressMap);
    }
  }

  static updateAchievementsProgressWithReceivedCosmeticChest(userId, cosmeticChestType) {
    Logger.module('AchievementsModule').debug(`updateAchievementsProgressWithReceivedCosmeticChest() -> Updating cosmetic chest achievement progress for ${userId.blue}`.green);
    let progressMade = false;
    const progressMap = {};
    const enabledAchievements = SDK.AchievementsFactory.getEnabledAchievementsMap();
    for (var achievementId in enabledAchievements) {
      var achievement = enabledAchievements[achievementId];
      var achievementProgress = achievement.progressForReceivingCosmeticChest(cosmeticChestType);
      if (achievementProgress) {
        progressMap[achievementId] = achievementProgress;
        progressMade = true;
      }
    }

    if (!progressMade) {
      return Promise.resolve([]);
    } else {
      return this._applyAchievementProgressMapToUser(userId, progressMap);
    }
  }

  static updateAchievementsProgressWithLogin(userId, currentLoginMoment) {
    Logger.module('AchievementsModule').debug(`updateAchievementsProgressWithLogin() -> Updating login achievement progress for ${userId.blue}`.green);
    let progressMade = false;
    const progressMap = {};
    const enabledAchievements = SDK.AchievementsFactory.getEnabledAchievementsMap();
    for (var achievementId in enabledAchievements) {
      var achievement = enabledAchievements[achievementId];
      var achievementProgress = achievement.progressForLoggingIn(currentLoginMoment);
      if (achievementProgress) {
        progressMap[achievementId] = achievementProgress;
        progressMade = true;
      }
    }

    if (!progressMade) {
      return Promise.resolve([]);
    } else {
      return this._applyAchievementProgressMapToUser(userId, progressMap);
    }
  }

  static updateAchievementsProgressWithSpiritOrbOpening(userId, spiritOrbOpenedFromSet) {
    Logger.module('AchievementsModule').debug(`updateAchievementsProgressWithSpiritOrbOpening() -> Updating spirit orb opening achievement progress for ${userId.blue}`.green);
    let progressMade = false;
    const progressMap = {};
    const enabledAchievements = SDK.AchievementsFactory.getEnabledAchievementsMap();
    for (var achievementId in enabledAchievements) {
      var achievement = enabledAchievements[achievementId];
      var achievementProgress = achievement.progressForOpeningSpiritOrb(spiritOrbOpenedFromSet);
      if (achievementProgress) {
        progressMap[achievementId] = achievementProgress;
        progressMade = true;
      }
    }

    if (!progressMade) {
      return Promise.resolve([]);
    } else {
      return this._applyAchievementProgressMapToUser(userId, progressMap);
    }
  }

  //  resolves to an array of ids for newly completed achievements
  static _applyAchievementProgressMapToUser(userId, progressMap, gameId = null) {
    const _chainState: Record<string, any> = {};
    Logger.module('AchievementsModule').debug(`_applyAchievementProgressMapToUser() -> Updating achievement progress for ${userId.blue}`.green);
    const enabledAchievements = SDK.AchievementsFactory.getEnabledAchievementsMap();

    const MOMENT_NOW_UTC = moment().utc();

    var txPromise = knex.transaction((tx) => PromiseUtils.withTimeout(Promise.resolve(tx('users').where('id', userId).first('id').forUpdate())
      .then(function () {
        const achievementIds = _.keys(progressMap);
        return knex('user_achievements').whereIn('achievement_id', achievementIds).andWhere('user_id', userId).transacting(tx);
      }).then(function (achievementRows) {
        _chainState.updatedAchievements = [];
        _chainState.rewards = [];
        _chainState.completedAchievementIds = [];

        // method that will be used to process the achievements map serially with 1 concurrency so that there's no chance of card log getting overwritten
        const processAchievementSerialy = (achievementId) => {
          Logger.module('AchievementsModule').debug(`_applyAchievementProgressMapToUser() -> processing achievement ${achievementId} for ${userId.blue}`);

          const achievementProgress = progressMap[achievementId];
          const allPromises = [];

          let row = _.find(achievementRows, (r) => r.achievement_id === achievementId);
          const needsInsert = !row;

          // if this achievement's already done, just move on
          if (row != null ? row.completed_at : undefined) {
            return Promise.resolve();
          }

          // if the row does not exist, set up the initial data
          if (row == null) {
            row = {
              user_id: userId,
              achievement_id: achievementId,
              progress: 0,
              progress_required: enabledAchievements[achievementId].progressRequired,
              created_at: MOMENT_NOW_UTC.toDate(),
              is_unread: true,
            };
          }

          // mark row progress
          row.progress = Math.min(row.progress + achievementProgress, enabledAchievements[achievementId].progressRequired);

          // if the achievement is complete, process rewards
          if (!row.completed_at && (row.progress >= enabledAchievements[achievementId].progressRequired)) {
            let rewardType,
              rewardValue,
              type;
            row.completed_at = MOMENT_NOW_UTC.toDate();
            _chainState.completedAchievementIds.push(achievementId);

            // looks like a completed achievement...
            const rewardObject = {
              id: generatePushId(),
              user_id: userId,
              reward_category: 'achievement',
              reward_type: achievementId,
              created_at: MOMENT_NOW_UTC.toDate(),
              game_id: gameId,
              is_unread: true,
            };

            if (row.reward_ids == null) { row.reward_ids = []; }
            row.reward_ids.push(rewardObject.id);

            const object = SDK.AchievementsFactory.achievementForIdentifier(achievementId).rewards;
            for (rewardType in object) {
            // perform any reward conversions needed
              var randomIndex,
                rewardedCardId;
              rewardValue = object[rewardType];
              if (rewardType === 'spiritOrb') {
                rewardObject.spirit_orbs = rewardValue;
              } else if (rewardType === 'cards') {
                var cardIds = [];
                for (var c of Array.from<any>(rewardValue)) {
                  if (parseInt(c)) {
                    Logger.module('AchievementsModule').debug('_applyAchievementProgressMapToUser() -> giving user card', c);
                    cardIds.push(parseInt(c));
                  } else if (c.count) {
                    Logger.module('AchievementsModule').debug('_applyAchievementProgressMapToUser() -> giving user cards with data', c);
                    var factionId = _.sample(c.factionId);
                    var rarityId = c.rarity;
                    var cardSet = c.cardSet || 1;
                    var cardsForFaction = SDK.GameSession.getCardCaches().getCardSet(cardSet).getFaction(factionId).getRarity(rarityId)
                      .getIsUnlockable(false)
                      .getIsCollectible(true)
                      .getIsPrismatic(false)
                      .getIsGeneral(false)
                      .getCards();
                    var cardIdsToSample = c.sample || _.map(cardsForFaction, (c) => c.id);
                    var cardId = _.sample(cardIdsToSample);
                    for (var j = 1, end = c.count, asc = end >= 1; asc ? j <= end : j >= end; asc ? j++ : j--) {
                      cardIds.push(cardId);
                    }
                  }
                }
                rewardObject.cards = cardIds;
              } else if (rewardType === 'neutralCommonCard') {
                var neutralCommonCards = SDK.GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getFaction(Faction.Neutral).getRarity(Rarity.Common)
                  .getIsUnlockable(false)
                  .getIsCollectible(true)
                  .getIsPrismatic(false)
                  .getCards();
                randomIndex = _.random(0, neutralCommonCards.length - 1);
                rewardedCardId = neutralCommonCards[randomIndex].getId();
                if (!rewardObject.cards) {
                  rewardObject.cards = [];
                }
                rewardObject.cards.push(rewardedCardId);
              } else if (rewardType === 'neutralRareCard') {
                var neutralRareCards = SDK.GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getFaction(Faction.Neutral).getRarity(Rarity.Rare)
                  .getIsUnlockable(false)
                  .getIsCollectible(true)
                  .getIsPrismatic(false)
                  .getCards();
                randomIndex = _.random(0, neutralRareCards.length - 1);
                rewardedCardId = neutralRareCards[randomIndex].getId();
                if (!rewardObject.cards) {
                  rewardObject.cards = [];
                }
                rewardObject.cards.push(rewardedCardId);
              } else if (rewardType === 'neutralEpicCard') {
                var neutralEpicCards = SDK.GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getFaction(Faction.Neutral).getRarity(Rarity.Epic)
                  .getIsUnlockable(false)
                  .getIsCollectible(true)
                  .getIsPrismatic(false)
                  .getCards();
                randomIndex = _.random(0, neutralEpicCards.length - 1);
                rewardedCardId = neutralEpicCards[randomIndex].getId();
                if (!rewardObject.cards) {
                  rewardObject.cards = [];
                }
                rewardObject.cards.push(rewardedCardId);
              } else if (rewardType === 'neutralLegendaryCard') {
                var neutralLegendaryCards = SDK.GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getFaction(Faction.Neutral).getRarity(Rarity.Legendary)
                  .getIsUnlockable(false)
                  .getIsCollectible(true)
                  .getIsPrismatic(false)
                  .getCards();
                randomIndex = _.random(0, neutralLegendaryCards.length - 1);
                rewardedCardId = neutralLegendaryCards[randomIndex].getId();
                if (!rewardObject.cards) {
                  rewardObject.cards = [];
                }
                rewardObject.cards.push(rewardedCardId);
              } else if (rewardType === 'factionLegendaryCard') {
                var factionLegendaryCards = _.filter(SDK.GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Legendary).getIsUnlockable(false)
                  .getIsCollectible(true)
                  .getIsPrismatic(false)
                  .getCards(), (card) => card.getFactionId() !== Faction.Neutral);
                randomIndex = _.random(0, factionLegendaryCards.length - 1);
                rewardedCardId = factionLegendaryCards[randomIndex].getId();
                if (!rewardObject.cards) {
                  rewardObject.cards = [];
                }
                rewardObject.cards.push(rewardedCardId);
              } else if (rewardType === 'gauntletTicket') {
                rewardObject.gauntlet_tickets = rewardValue;
              } else if (rewardType === 'gold') {
                rewardObject[rewardType] = rewardValue;
              } else if (rewardType === 'spirit') {
                rewardObject[rewardType] = rewardValue;
              } else if (rewardType === 'cosmetics') {
                rewardObject[rewardType] = rewardValue;
              } else if (rewardType === 'bronzeCrateKey') {
                if (rewardObject.cosmetic_keys == null) { rewardObject.cosmetic_keys = []; }
                for (var i = 1, end1 = rewardValue, asc1 = end1 >= 1; asc1 ? i <= end1 : i >= end1; asc1 ? i++ : i--) {
                  rewardObject.cosmetic_keys.push(SDK.CosmeticsChestTypeLookup.Common);
                }
              } else if (rewardType === 'giftChests') {
                if (rewardObject.gift_chests == null) { rewardObject.gift_chests = []; }
                for (type of Array.from<any>(rewardValue)) {
                  rewardObject.gift_chests.push(type);
                }
              }
            }

            if (rewardObject.gold) { allPromises.push(InventoryModule.giveUserGold(txPromise, tx, userId, rewardObject.gold, 'achievement', achievementId)); }
            if (rewardObject.spirit) { allPromises.push(InventoryModule.giveUserSpirit(txPromise, tx, userId, rewardObject.spirit, 'achievement', achievementId)); }
            if (rewardObject.cards) { allPromises.push(InventoryModule.giveUserCards(txPromise, tx, userId, rewardObject.cards, 'achievement', achievementId)); }
            if (rewardObject.spirit_orbs) { allPromises.push(InventoryModule.addBoosterPackToUser(txPromise, tx, userId, 1, 'achievement', achievementId)); }
            if (rewardObject.gauntlet_tickets) { allPromises.push(InventoryModule.addArenaTicketToUser(txPromise, tx, userId, 'achievement', achievementId)); }
            if (rewardObject.cosmetics) {
              for (var cosmeticId of Array.from<any>(rewardObject.cosmetics)) {
                allPromises.push(InventoryModule.giveUserCosmeticId(txPromise, tx, userId, cosmeticId, 'achievement reward', achievementId, null, MOMENT_NOW_UTC));
              }
            }
            if (rewardObject.cosmetic_keys) {
              for (var keyType of Array.from<any>(rewardObject.cosmetic_keys)) {
                allPromises.push(CosmeticChestsModule.giveUserChestKey(txPromise, tx, userId, keyType, 1, 'achievement reward', achievementId, MOMENT_NOW_UTC));
              }
            }
            if (rewardObject.gift_chests) {
              for (type of Array.from<any>(rewardObject.gift_chests)) {
                allPromises.push(GiftCrateModule.addGiftCrateToUser(txPromise, tx, userId, type, achievementId, MOMENT_NOW_UTC));
              }
            }

            // random un-owned cosmetic needs special handling
            if (rewardType === 'newRandomCosmetics') {
              for (var cosmeticParams of Array.from<any>(rewardValue)) {
                allPromises.push(InventoryModule.giveUserNewPurchasableCosmetic(txPromise, tx, userId, 'achievement reward', achievementId, cosmeticParams.rarity, cosmeticParams.type, null, MOMENT_NOW_UTC).then((cosmeticReward) => {
                  if ((cosmeticReward != null) && (cosmeticReward.cosmetic_id != null)) {
                    if (rewardObject.cosmetics == null) { rewardObject.cosmetics = []; }
                    rewardObject.cosmetics.push(cosmeticReward.cosmetic_id);
                  }
                  if (cosmeticReward.spirit != null) {
                    if (rewardObject.spirit == null) { rewardObject.spirit = 0; }
                    rewardObject.spirit += cosmeticReward.spirit;
                  }

                  _chainState.rewards.push(rewardObject);
                  return tx('user_rewards').insert(rewardObject);
                }),
                );
              }
            } else if (rewardType === 'mythronCard') {
              allPromises.push(AchievementsModule.giveMythronCard(txPromise, tx, userId, achievementId).then((rewardedCardId) => {
                if (!rewardObject.cards) {
                  rewardObject.cards = [];
                }
                rewardObject.cards.push(rewardedCardId);
                return tx('user_rewards').insert(rewardObject);
              }),
              );
            } else {
              _chainState.rewards.push(rewardObject);
              allPromises.push(tx('user_rewards').insert(rewardObject));
            }
          }

          // save to database
          if (needsInsert) {
          // insert the achievement into the database?
            allPromises.push(knex('user_achievements').insert(row).transacting(tx));
            _chainState.updatedAchievements.push(row);
          } else {
            row.updated_at = MOMENT_NOW_UTC.toDate();
            // update the achievement in the database
            allPromises.push(knex('user_achievements').where({
              user_id: userId,
              achievement_id: achievementId,
            }).update({
              progress: row.progress,
              completed_at: row.completed_at,
              updated_at: row.updated_at,
              reward_ids: row.reward_ids,
            }).transacting(tx),
            );
            _chainState.updatedAchievements.push(row);
          }

          return Promise.all(allPromises);
        };

        // process the achievements map serially with 1 concurrency so that there's no chance of card log getting overwritten
        return PromiseUtils.map(_.keys(progressMap), processAchievementSerialy, { concurrency: 1 });
      })
      .then(() => SyncModule._bumpUserTransactionCounter(tx, userId)), 10000)
      .catch(onType(PromiseUtils.TimeoutError, function (e) {
        Logger.module('AchievementsModule').error(`_applyAchievementProgressMapToUser() -> ERROR, operation timeout for u:${userId} g:${gameId}`);
        throw e;
      })))
    // because achievements can have rewards, to avoid a race condition we write to FB outside the transaction after all the data / rewards have been writtan and are ready to read via REST API
      .then(() => DuelystFirebase.connect().getRootRef())
      .then(function (fbRootRef) {
        const allPromises = [];

        // for reward in @.rewards

        //   reward_id = reward.id
        //   delete reward.id
        //   delete reward.user_id
        //   allPromises.push FirebasePromises.set(fbRootRef.child("user-rewards").child(userId).child(reward_id),Helpers.restifyData(reward))

        for (var row of Array.from<any>(_chainState.updatedAchievements)) {
          var sdkAchievement = SDK.AchievementsFactory.achievementForIdentifier(row.achievement_id);

          if (sdkAchievement.tracksProgress) {
            var progressData = _.extend({}, row);
            delete progressData.user_id;
            delete progressData.reward_ids;
            delete progressData.is_unread;

            allPromises.push(FirebasePromises.update(fbRootRef.child('user-achievements').child(userId).child('progress').child(row.achievement_id), Helpers.restifyData(progressData)));
          }

          if (row.completed_at) {
            var completionData = _.extend({}, row);
            delete completionData.user_id;
            delete completionData.progress;
            delete completionData.progress_required;

            // allPromises.push FirebasePromises.remove(fbRootRef.child("user-achievements").child(userId).child("progress").child(row.achievement_id))
            allPromises.push(FirebasePromises.set(fbRootRef.child('user-achievements').child(userId).child('completed').child(row.achievement_id), Helpers.restifyData(completionData)));
          }
        }

        return Promise.all(allPromises);
      });

    return txPromise;
  }

  static giveMythronCard(txPromise, tx, userId, achievementId) {
    const _chainState: Record<string, any> = {};
    return tx('user_card_collection').first('cards').where('user_id', userId)
      .then(function (card_collection_data) {
        let randomIndex,
          rewardedCardId;
        let mythronCards = SDK.GameSession.getCardCaches().getRarity(Rarity.Mythron).getIsUnlockable(false).getIsCollectible(true)
          .getIsPrismatic(false)
          .getCards();
        const unownedMythronCards = [];
        for (var mythronCard of Array.from<any>(mythronCards)) {
          if (!(card_collection_data.cards[mythronCard.getId()]) || (__guard__(card_collection_data.cards[mythronCard.getId()], (x) => x.count) < 1)) {
            unownedMythronCards.push(mythronCard);
          }
        }

        // if we found any unowned non-prismatic mythron cards, pick one to award
        if (unownedMythronCards.length > 0) {
          randomIndex = _.random(0, unownedMythronCards.length - 1);
          rewardedCardId = unownedMythronCards[randomIndex].getId();
          // if player owns all non-prismatic mythron cards, give a random prismatic one
        } else {
          mythronCards = SDK.GameSession.getCardCaches().getRarity(Rarity.Mythron).getIsUnlockable(false).getIsCollectible(true)
            .getIsPrismatic(true)
            .getCards();
          randomIndex = _.random(0, mythronCards.length - 1);
          rewardedCardId = mythronCards[randomIndex].getId();
        }
        _chainState.rewardedCardId = rewardedCardId;
        return rewardedCardId;
      })
      .then((rewardedCardId) => Promise.all([
        InventoryModule.giveUserCards(txPromise, tx, userId, [rewardedCardId], 'achievement', achievementId),
      ]))
      .then(function () {
        return Promise.resolve(_chainState.rewardedCardId);
      });
  }
}

module.exports = AchievementsModule;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
