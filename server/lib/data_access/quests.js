/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS202: Simplify dynamic range loops
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Promise = require('bluebird');
const util = require('util');
const FirebasePromises = require('../firebase_promises');
const DuelystFirebase = require('../duelyst_firebase_module');
const Logger = require('../../../app/common/logger');
const colors = require('colors');
const moment = require('moment');
const _ = require('underscore');
const InventoryModule = require('./inventory');
const CosmeticChestsModule = require('./cosmetic_chests');
const SyncModule = require('./sync');
const GamesModule = require('./games');
const GiftCrateModule = require('./gift_crate');
const Errors = require('../custom_errors');
const knex = require('./knex');
const config = require('../../../config/config.js');
const generatePushId = require('../../../app/common/generate_push_id');

// redis
const { Redis, Jobs, GameManager } = require('../../redis');

// SDK imports
const SDK = require('../../../app/sdk');
const QuestFactory = require('../../../app/sdk/quests/questFactory');
const QuestCatchUp = require('../../../app/sdk/quests/questCatchUp');
const QuestType = require('../../../app/sdk/quests/questTypeLookup');
const UtilsGameSession = require('../../../app/common/utils/utils_game_session');
const NewPlayerProgressionHelper = require('../../../app/sdk/progression/newPlayerProgressionHelper');
const NewPlayerProgressionStageEnum = require('../../../app/sdk/progression/newPlayerProgressionStageEnum');

class QuestsModule {
  static initClass() {
    // Quest Slot definitions
    this.DAILY_QUEST_SLOTS = [0, 1];
    this.CATCH_UP_QUEST_SLOT = 10;
    this.SEASONAL_QUEST_SLOT = 20;
    this.PROMOTIONAL_QUEST_SLOT = 30;

    // control if seasonal / catchup quests should be active
    this.SEASONAL_QUESTS_ACTIVE = true;
    this.CATCH_UP_QUEST_ACTIVE = true;
    this.PROMOTIONAL_QUEST_ACTIVE = true;

    // Catch up quest reward definitions
    this.CATCH_UP_CHARGE_GOLD_VALUE = 50;
    this.CATCH_UP_MAX_GOLD_VALUE = 50;
  }

  /**
   * Checks if a user needs daily quests.
   * @public
   * @param  {String}  userId    User ID for which to check.
   * @param  {Moment}  systemTime  Pass in the current system time to use to generate quests. Used only for testing.
   * @return  {Promise}        Promise that will post a BOOL value if the user needs new daily quests.
   */
  static needsDailyQuests(userId, systemTime) {
    // userId must be defined
    if (!userId) {
      return Promise.reject(new Error(`Can not find if user needs daily quests: invalid user ID - ${userId}`));
    }

    const MOMENT_NOW_UTC = systemTime || moment().utc();

    return Promise.all([
      knex('user_new_player_progression').first('stage').where('module_name', 'core').andWhere('user_id', userId),
      knex('users').first('daily_quests_generated_at').where('id', userId),
      knex('user_quests').select().where('user_id', userId),
    ])
      .bind({})
      .spread(function (newPlayerProgressionRow, userRow, questRows) {
        const currentStage = NewPlayerProgressionStageEnum[newPlayerProgressionRow != null ? newPlayerProgressionRow.stage : undefined] || NewPlayerProgressionStageEnum.Tutorial;
        if (currentStage.value < NewPlayerProgressionHelper.DailyQuestsStartToGenerateStage.value) {
          return Promise.resolve(false);
        }

        // if the first two quest slots are populated by begginer quests, no need to generate daily quests "yet"
        const begginerQuestsInFirstTwoSlots = _.filter(questRows, (q) => (q.quest_slot_index < 2) && __guard__(QuestFactory.questForIdentifier(q.quest_type_id), (x) => x.isBeginner));
        if ((begginerQuestsInFirstTwoSlots != null ? begginerQuestsInFirstTwoSlots.length : undefined) === 2) {
          return Promise.resolve(false);
        }

        if (questRows != null) {
          for (var quest of Array.from(questRows)) {
          // remove any quests that are no longer in the quest factory at all
            if (!QuestFactory.questForIdentifier(quest.quest_type_id)) {
              return Promise.resolve(true);
            }
            // remove any quests that are no longer supposed to be in the system
            if (_.contains(QuestFactory.questForIdentifier(quest.quest_type_id).types, QuestType.ExcludeFromSystem)) {
              return Promise.resolve(true);
            }
            // remove catch up quests that ended up in wrong slot.
            if (_.contains(QuestFactory.questForIdentifier(quest.quest_type_id).types, QuestType.CatchUp) && (quest.quest_slot_index !== QuestsModule.CATCH_UP_QUEST_SLOT)) {
              return Promise.resolve(true);
            }
          }
        }

        if (userRow.daily_quests_generated_at != null) {
          const now_utc_val = MOMENT_NOW_UTC.valueOf();
          const daysPassed = (now_utc_val - moment(userRow.daily_quests_generated_at).utc().valueOf()) / 1000 / 60 / 60 / 24;
          if (daysPassed < 1) {
            return Promise.resolve(false);
          } else {
            return Promise.resolve(true);
          }
        } else {
          return Promise.resolve(true);
        }
      });
  }

  /**
   * Generates firebase format of quest data from a given quest
   * @public
   * @param  {Quest}    quest      The SDK quest object.
   * @param  {Moment}  createdAt    OPTIONA: Custom moment date to use for created / begin_at attributes.
   * @return  {Object}          the json representation of the given quest
   */
  static _questDataForQuest(quest, createdAt) {
    createdAt = createdAt || moment().utc();
    const quest_data = {};
    quest_data.is_unread = true;
    quest_data.begin_at = createdAt.clone().startOf('day').toDate();
    quest_data.created_at = createdAt.toDate();
    if (quest.getGoldReward()) {
      quest_data.gold = quest.getGoldReward();
    }
    if (quest.getSpiritOrbsReward()) {
      quest_data.spirit_orbs = quest.getSpiritOrbsReward();
    }
    quest_data.quest_type_id = quest.id;
    quest_data.is_replaceable = quest.getIsReplaceable();
    quest_data.params = quest.params;
    // quest_data.completion_count = 0
    quest_data.progress = 0;
    // quest_data.quest_name = quest.getName()
    // quest_data.quest_instructions = quest.getDescription()

    return quest_data;
  }

  /**
   * Generate one new daily quest for a user. If run for the first time, it will generate 2 daily quests.
   * @public
   * @param  {String}  userId    User ID for which to generate new daily quests.
   * @param  {Moment}  systemTime  Pass in the current system time to use to generate quests. Used only for testing.
   * @return  {Promise}        Promise that will post QUEST DATA on completion.
   */
  static generateDailyQuests(userId, systemTime) {
    // userId must be defined
    if (!userId) {
      return Promise.reject(new Error(`Can not find if user needs daily quests: invalid user ID - ${userId}`));
    }

    Logger.module('QuestsModule').time(`generateDailyQuests() -> for user ${userId.blue}.`.green);

    const MOMENT_NOW_UTC = systemTime || moment().utc();

    const this_obj = {};

    var txPromise = knex.transaction(function (tx) {
      Promise.all([
        knex('users')
          .transacting(tx)
          .forUpdate()
          .first()
          .where('id', userId),
        knex('user_quests')
          .transacting(tx)
          .forUpdate()
          .select()
          .where({ user_id: userId }),
      ])
        .bind(this_obj)
        .spread(function (userRow, questRows) {
          this.updatedQuests = [];
          this.userRow = userRow;
          this.removedQuests = [];

          const removalQueries = [];
          const allQueries = [];

          const quest_ids_generated = [];

          // Remove any invalid quests and build list of existing generated quest ids
          questRows = _.reduce(questRows, ((memo, row, i) => {
            const sdkQuest = QuestFactory.questForIdentifier(row.quest_type_id);
            // remove any quests that are no longer in the quest factory at all
            if ((sdkQuest == null)) {
              removalQueries.push(tx('user_quests').where({ user_id: row.user_id, quest_slot_index: row.quest_slot_index }).delete());
              row.quest_slot_index = -1;
              // remove any quests that are no longer supposed to be in the system
            } else if (_.contains(sdkQuest.types, QuestType.ExcludeFromSystem)) {
              removalQueries.push(tx('user_quests').where({ user_id: row.user_id, quest_slot_index: row.quest_slot_index }).delete());
              row.quest_slot_index = -1;
              // remove any expired promo quests
            } else if (_.contains(sdkQuest.types, QuestType.Promotional) && !sdkQuest.isAvailableOn(MOMENT_NOW_UTC)) {
              removalQueries.push(tx('user_quests').where({ user_id: row.user_id, quest_slot_index: row.quest_slot_index }).delete());
              row.previous_quest_slot_index = row.quest_slot_index;
              row.quest_slot_index = -1;
              this.removedQuests.push(row);
              // remove catch up quests that ended up in wrong slot.
            } else if (_.contains(sdkQuest.types, QuestType.CatchUp) && (row.quest_slot_index !== QuestsModule.CATCH_UP_QUEST_SLOT)) {
              removalQueries.push(tx('user_quests').where({ user_id: row.user_id, quest_slot_index: row.quest_slot_index }).delete());
              row.quest_slot_index = -1;
            } else {
              memo.push(row);
              // make sure we don't generate duplicate quests
              quest_ids_generated.push(row.quest_type_id);
            }
            return memo;
          }
          ), []);

          // generate a seasonal quest if needed
          // seasonal quests like the frostfire quest are intended to last for 1 month or so and have long completion goals
          // you can only have one seasonal quest active at a time, and it can not be replaced
          const existingSeasonalQuest = _.find(questRows, (q) => q.quest_slot_index === QuestsModule.SEASONAL_QUEST_SLOT);
          if (!existingSeasonalQuest && QuestsModule.SEASONAL_QUESTS_ACTIVE) {
            Logger.module('QuestsModule').debug(`generateDailyQuests() -> No active seasonal quest found for user ${userId.blue}.`);
            const seasonalQuest = QuestFactory.seasonalQuestForMoment(MOMENT_NOW_UTC);
            if (seasonalQuest != null) {
              Logger.module('QuestsModule').debug(`generateDailyQuests() -> Current season has quest ${seasonalQuest.name}. ${userId.blue}.`);
              const sQuest = QuestsModule._questDataForQuest(seasonalQuest, MOMENT_NOW_UTC);
              sQuest.user_id = userId;
              sQuest.quest_slot_index = QuestsModule.SEASONAL_QUEST_SLOT;
              // add to the list of generated quests so we don't create duplicates
              quest_ids_generated.push(seasonalQuest.id);
              allQueries.push(tx('user_quests_complete').where('user_id', userId).andWhere('quest_type_id', seasonalQuest.id).first()
                .then((completedQuestRow) => {
                  if ((completedQuestRow == null)) {
                    Logger.module('QuestsModule').debug(`generateDailyQuests() -> Generating ${seasonalQuest.name} seasonal quest for ${userId.blue}.`);
                    // update return data
                    this.updatedQuests.push(sQuest);
                    questRows.push(sQuest);
                    // save quest
                    return tx.insert(sQuest).into('user_quests');
                  } else {
                    return Logger.module('QuestsModule').debug(`generateDailyQuests() -> User ${userId.blue} already completed ${seasonalQuest.name} seasonal quest.`);
                  }
                }),
              );
            }
          }

          // generate a promotional quest if needed
          const existingPromotionalQuest = _.find(questRows, (q) => q.quest_slot_index === QuestsModule.PROMOTIONAL_QUEST_SLOT);
          const newPromotionalQuest = QuestFactory.promotionalQuestForMoment(MOMENT_NOW_UTC);
          const replaceCurrentPromoQuest = (existingPromotionalQuest != null) && (newPromotionalQuest != null) && (existingPromotionalQuest.id < newPromotionalQuest.id);

          if ((((existingPromotionalQuest == null) && (newPromotionalQuest != null)) || replaceCurrentPromoQuest) && QuestsModule.PROMOTIONAL_QUEST_ACTIVE) {
            Logger.module('QuestsModule').debug(`generateDailyQuests() -> No active promotional quest found for user ${userId.blue}.`);
            if (newPromotionalQuest != null) {
              Logger.module('QuestsModule').debug(`generateDailyQuests() -> Current promotional quest ${newPromotionalQuest.name}. ${userId.blue}.`);
              const pQuest = QuestsModule._questDataForQuest(newPromotionalQuest, MOMENT_NOW_UTC);
              pQuest.user_id = userId;
              pQuest.quest_slot_index = QuestsModule.PROMOTIONAL_QUEST_SLOT;
              // add to the list of generated quests so we don't create duplicates
              quest_ids_generated.push(newPromotionalQuest.id);
              allQueries.push(tx('user_quests_complete').where('user_id', userId).andWhere('quest_type_id', newPromotionalQuest.id).first()
                .then((completedQuestRow) => {
                  if ((completedQuestRow == null)) {
                    Logger.module('QuestsModule').debug(`generateDailyQuests() -> Generating ${newPromotionalQuest.name} promotional quest for ${userId.blue}.`);
                    // update return data
                    this.updatedQuests.push(pQuest);
                    questRows.push(pQuest);
                    // save quest
                    return tx.insert(pQuest).into('user_quests');
                  } else {
                    return Logger.module('QuestsModule').debug(`generateDailyQuests() -> User ${userId.blue} already completed ${newPromotionalQuest.name} promotional quest.`);
                  }
                }),
              );
            }
          }

          // Determine number of catchup charges to give player
          let daysSinceGeneration = MOMENT_NOW_UTC.clone().startOf('day').diff(moment.utc(userRow.daily_quests_generated_at), 'days');
          if ((daysSinceGeneration > 0) && QuestsModule.CATCH_UP_QUEST_ACTIVE) {
            let numCatchUpChargesGenerated = 0;
            // 1 charge per incompleted daily quest
            numCatchUpChargesGenerated += _.reduce(questRows, function (memo, questRow) {
              const sdkQuest = QuestFactory.questForIdentifier(questRow.quest_type_id);
              if ((sdkQuest != null) && !sdkQuest.isCatchUp && !sdkQuest.isBeginner && (questRow.quest_slot_index < QuestsModule.CATCH_UP_QUEST_SLOT)) {
                return memo + 1;
              } else {
                return memo;
              }
            }, 0);
            // 2 charges per day missed without quest generation (Doesn't count the current 1)
            daysSinceGeneration = MOMENT_NOW_UTC.clone().startOf('day').diff(moment.utc(userRow.daily_quests_generated_at), 'days');
            // days since generation has to be at least 1 when we are here generating quests
            daysSinceGeneration = Math.max(daysSinceGeneration, 1);
            numCatchUpChargesGenerated += (daysSinceGeneration - 1) * 2;

            if (numCatchUpChargesGenerated !== 0) {
              allQueries.push(QuestsModule._giveUserCatchUpQuestCharge(txPromise, tx, userId, numCatchUpChargesGenerated, MOMENT_NOW_UTC).then((catchupQuestRow) => {
                if (catchupQuestRow != null) {
                  return questRows.push(catchupQuestRow);
                }
              }),
              );
            }
          }
          // TODO: should we also add the catchup quest to @.updatedQuests.push(sQuest) to somehow mark the daily_quests_updated_at as dirty?

          for (var i of Array.from(QuestsModule.DAILY_QUEST_SLOTS)) {
            var questAtSlot = undefined;
            for (var r of Array.from(questRows)) {
              if (r.quest_slot_index === i) {
                questAtSlot = r;
                break;
              }
            }

            if (!questAtSlot) {
              Logger.module('QuestsModule').debug(`generateDailyQuests() -> Generating quest for slot ${i}. user ${userId.blue}.`);

              var sdkQuest = QuestFactory.randomQuestForSlotExcludingIds(i, quest_ids_generated);
              var quest = QuestsModule._questDataForQuest(sdkQuest, MOMENT_NOW_UTC);
              quest.user_id = userId;
              quest.quest_slot_index = i;
              // add to the list of generated quests so we don't create duplicates
              quest_ids_generated.push(sdkQuest.id);

              this.updatedQuests.push(quest);

              allQueries.push(
                knex.insert(quest).into('user_quests').transacting(tx),
              );

              // update return data
              questRows.push(quest);
            }
          }

          // save out final quest rows for method response
          this.questRows = questRows;

          // Logger.module("QuestsModule").debug("generateDailyQuests() -> Saving to DB. Executing #{allQueries.length} queries. user #{userId.blue}.")
          return Promise.all(removalQueries).then(() => Promise.all(allQueries));
        }).then(function () {
          const start_of_today_utc = MOMENT_NOW_UTC.clone().startOf('day').toDate();
          let dirty = false;
          // if we generated new quests
          if (this.updatedQuests.length > 0) {
          // mark that we've updated quests on the user
            this.userRow.daily_quests_updated_at = MOMENT_NOW_UTC.toDate();
            this.userRow.daily_quests_generated_at = start_of_today_utc;
            dirty = true;
          }
          // if it's a new day
          if (start_of_today_utc.valueOf() !== (this.userRow.daily_quests_generated_at != null ? this.userRow.daily_quests_generated_at.valueOf() : undefined)) {
          // always mark the last time that question generation ran regardless if an update occured
            this.userRow.daily_quests_generated_at = start_of_today_utc;
            dirty = true;
          }
          // update user record if needed
          if (dirty) {
            Logger.module('QuestsModule').debug(`generateDailyQuests() -> Updating user record. user ${userId.blue}.`);
            return tx('users').where('id', userId).update({
              daily_quests_generated_at: this.userRow.daily_quests_generated_at,
              daily_quests_updated_at: this.userRow.daily_quests_updated_at,
            });
          }
        })
        .then(() => SyncModule._bumpUserTransactionCounter(tx, userId))
        .then(tx.commit)
        .catch(tx.rollback);
    }).bind(this_obj)
      .then(() => DuelystFirebase.connect().getRootRef()).then(function (fbRootRef) {
        this.fbRootRef = fbRootRef;

        const allPromises = [];

        for (var q of Array.from(this.removedQuests)) {
          var slotIndex = q.previous_quest_slot_index;

          allPromises.push(
            FirebasePromises.remove(this.fbRootRef.child('user-quests').child(userId).child('daily').child('current')
              .child('quests')
              .child(slotIndex)),
          );
        }

        return Promise.all(allPromises);
      })
      .then(function () {
        const allPromises = [];

        for (var q of Array.from(this.updatedQuests)) {
          var data = _.clone(q);
          var slotIndex = data.quest_slot_index;
          delete data.quest_slot_index;
          delete data.user_id;
          data.created_at = moment.utc(data.created_at).valueOf();
          data.begin_at = moment.utc(data.begin_at).valueOf();
          if (data.mulliganed_at) { data.mulliganed_at = moment.utc(data.mulliganed_at).valueOf(); }
          if (data.updated_at) { data.updated_at = moment.utc(data.updated_at).valueOf(); }

          allPromises.push(
            FirebasePromises.set(this.fbRootRef.child('user-quests').child(userId).child('daily').child('current')
              .child('quests')
              .child(slotIndex), data),
            FirebasePromises.set(this.fbRootRef.child('user-quests').child(userId).child('daily').child('current')
              .child('updated_at'), moment().utc(this.userRow.daily_quests_updated_at).valueOf()),
            FirebasePromises.set(this.fbRootRef.child('user-quests').child(userId).child('daily').child('current')
              .child('generated_at'), moment().utc(this.userRow.daily_quests_generated_at).valueOf()),
          );
        }

        // Logger.module("QuestsModule").debug("generateDailyQuests() -> Saving #{allPromises.length} quests to Firebase. user #{userId.blue}.")

        return Promise.all(allPromises);
      })
      .then(function () {
        Logger.module('QuestsModule').timeEnd(`generateDailyQuests() -> for user ${userId.blue}.`.green);

        const quests = {};

        for (var quest of Array.from(this.questRows)) {
          quests[quest.quest_slot_index] = quest;
        }

        const returnData = {
          generated_at: this.userRow.daily_quests_generated_at,
          updated_at: this.userRow.daily_quests_updated_at,
          quests,
        };

        return returnData;
      });

    return txPromise;
  }

  /**
   * Does this user need beginner quests.
   * @public
   * @param  {String}  userId    User ID for which to check.
   * @param  {Moment}  systemTime  Pass in the current system time to use to check. Used only for testing.
   * @return  {Promise}        Promise that will return TRUE/FALSE on completion.
   */
  static needsBeginnerQuests(userId, systemTime) {
    throw new Error('This method has not been tested!');

    // userId must be defined
    if (!userId) {
      return Promise.reject(new Error(`Can not find if user needs daily quests: invalid user ID - ${userId}`));
    }

    Logger.module('QuestsModule').time(`generateBeginnerQuests() -> for user ${userId.blue}.`.green);

    const MOMENT_NOW_UTC = systemTime || moment().utc();

    const this_obj = {};

    return knex('user_new_player_progression').first('stage').where('module_name', 'core').andWhere('user_id', userId)
      .bind(this_obj)
      .then(function (newPlayerCoreStateRow) {
      // current player stage
        const newPlayerStage = NewPlayerProgressionStageEnum[newPlayerCoreStateRow != null ? newPlayerCoreStateRow.stage : undefined] || NewPlayerProgressionStageEnum.Tutorial;

        // quests for this stage
        const questsToGenerate = NewPlayerProgressionHelper.questsForStage(newPlayerStage);

        // skip if nothing needs to be done
        if ((questsToGenerate == null) || (questsToGenerate.length === 0)) {
          return false;
        } else {
          return true;
        }
      });
  }

  /**
   * Generate a quest for new player progression if they need it.
   * @public
   * @param  {String}  userId    User ID for which to generate new daily quests.
   * @param  {Moment}  systemTime  Pass in the current system time to use to generate quests. Used only for testing.
   * @return  {Promise}        Promise that will post QUEST DATA on completion.
   */
  static generateBeginnerQuests(userId, systemTime) {
    // userId must be defined
    if (!userId) {
      return Promise.reject(new Error(`Can not find if user needs daily quests: invalid user ID - ${userId}`));
    }

    Logger.module('QuestsModule').time(`generateBeginnerQuests() -> for user ${userId.blue}.`.green);

    const MOMENT_NOW_UTC = systemTime || moment().utc();

    const this_obj = {};

    return knex('user_new_player_progression').first('stage').where('module_name', 'core').andWhere('user_id', userId)
      .bind(this_obj)
      .then(function (newPlayerCoreStateRow) {
      // current player stage
        const newPlayerStage = NewPlayerProgressionStageEnum[newPlayerCoreStateRow.stage] || NewPlayerProgressionStageEnum.Tutorial;

        Logger.module('QuestsModule').debug(`generateBeginnerQuests() -> stage ${newPlayerStage.key} for user ${userId.blue}.`);

        // quests for this stage
        const questsToGenerate = NewPlayerProgressionHelper.questsForStage(newPlayerStage);

        // skip if nothing needs to be done
        if ((questsToGenerate == null) || (questsToGenerate.length === 0)) {
          throw new Errors.NoNeedForNewBeginnerQuestsError();
        }

        return knex.transaction(function (tx) {
          Promise.all([
            tx('users').first('id').where('id', userId).forUpdate(),
            tx('user_quests').select().where({ user_id: userId }).forUpdate(),
            tx('user_quests_complete').select('quest_type_id').where({ user_id: userId }),
          ])
            .bind(this_obj)
            .spread(function (userRow, questRows, questCompleteRows) {
              let sdkQuest;
              this.updatedQuests = [];
              this.userRow = userRow;
              this.questRows = questRows;

              const allQueries = [];

              for (sdkQuest of Array.from(questsToGenerate)) {
                var questExists = _.find(questRows, (q) => q.quest_type_id === sdkQuest.id);
                var questCompleted = _.find(questCompleteRows, (q) => q.quest_type_id === sdkQuest.id);
                if (questExists || questCompleted) {
                  throw new Errors.NoNeedForNewBeginnerQuestsError('Beginner quests for this stage have already been generated.');
                }
              }

              // if questsToGenerate.length > (QuestsModule.MAX_QUEST_SLOTS-questRows.length)
              //   throw new Error("Not enough room to generate beginner quests.")

              for (var i = questRows.length, end = questRows.length + questsToGenerate.length, asc = questRows.length <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
                // if we've already popped off all the custom quests
                if (questsToGenerate.length === 0) {
                  break;
                }

                var questAtSlot = _.find(questRows, (q) => q.quest_slot_index === i);

                if (!questAtSlot) {
                  Logger.module('QuestsModule').debug(`generateBeginnerQuests() -> Generating quest for slot ${i}. user ${userId.blue}.`);

                  sdkQuest = questsToGenerate.pop();
                  var quest = QuestsModule._questDataForQuest(sdkQuest, MOMENT_NOW_UTC);
                  quest.user_id = userId;
                  quest.quest_slot_index = i;

                  this.updatedQuests.push(quest);

                  allQueries.push(
                    tx.insert(quest).into('user_quests'),
                  );

                  // update return data
                  questRows.push(quest);
                }
              }

              return Promise.all(allQueries);
            }).then(() => SyncModule._bumpUserTransactionCounter(tx, userId))
            .then(tx.commit)
            .catch(tx.rollback);
        }).bind(this_obj)
          .then(() => DuelystFirebase.connect().getRootRef())
          .then(function (fbRootRef) {
            const allPromises = [];

            for (var q of Array.from(this.updatedQuests)) {
              var data = _.clone(q);
              var slotIndex = data.quest_slot_index;
              delete data.quest_slot_index;
              delete data.user_id;
              data.created_at = moment.utc(data.created_at).valueOf();
              data.begin_at = moment.utc(data.begin_at).valueOf();
              if (data.mulliganed_at) { data.mulliganed_at = moment.utc(data.mulliganed_at).valueOf(); }
              if (data.updated_at) { data.updated_at = moment.utc(data.updated_at).valueOf(); }

              // TODO: should we somehow mark the daily_quests_updated_at of the user row for begginer quest generation as well?
              // TODO: below we seem to be double (we're in a loop) updating the quests updated_at property in Firebase

              allPromises.push(
                FirebasePromises.set(fbRootRef.child('user-quests').child(userId).child('daily').child('current')
                  .child('quests')
                  .child(slotIndex), data),
                FirebasePromises.set(fbRootRef.child('user-quests').child(userId).child('daily').child('current')
                  .child('updated_at'), moment().utc(this.userRow.daily_quests_updated_at).valueOf()),
              );
            }

            // Logger.module("QuestsModule").debug("generateDailyQuests() -> Saving #{allPromises.length} quests to Firebase. user #{userId.blue}.")

            return Promise.all(allPromises);
          });
      })
      .then(function () {
        Logger.module('QuestsModule').timeEnd(`generateBeginnerQuests() -> for user ${userId.blue}.`.green);

        const quests = [];

        for (var quest of Array.from(this.questRows)) {
          quests[quest.quest_slot_index] = quest;
        }

        const returnData = {
          updated_at: this.userRow.daily_quests_updated_at,
          quests,
        };

        return returnData;
      });
  }

  /**
   * Checks if a user can mulligan any daily quests.
   * @public
   * @param  {String}  userId    User ID for which to check.
   * @param  {Integer}  questIndex  Index of quest to attempt to mulligan.
   * @param  {Moment}  systemTime  Pass in the current system time to use to generate quests. Used only for testing.
   * @return  {Promise}        Promise that will post a BOOL value if the user can mulligan the daily quest.
   */
  static canMulliganDailyQuest(userId, questIndex, systemTime) {
    // userId must be defined
    if (!userId) {
      return Promise.reject(new Error(`Can not find if user needs daily quests: invalid user ID - ${userId}`));
    }

    const MOMENT_NOW_UTC = systemTime || moment().utc();

    return knex.first().from('user_quests').where({ user_id: userId, quest_slot_index: questIndex })
      .bind({})
      .then(function (questRow) {
        if (questRow != null) {
          if (!questRow.is_replaceable) {
            return Promise.resolve(false);
          }

          // looks like the user has no record of ever mulliganing a quest
          if (!questRow.mulliganed_at) {
            return Promise.resolve(true);
          }

          const now_utc_val = MOMENT_NOW_UTC.valueOf();
          const mulliganed_at_val = moment.utc(questRow.mulliganed_at).valueOf();
          const diff = now_utc_val - mulliganed_at_val;
          const duration = moment.duration(diff);

          // if a day (as 23 hours to avoid bugs) has rolled over since the last mulligan
          if (duration.asHours() < 23) {
            return Promise.resolve(false);
          } else {
            return Promise.resolve(true);
          }
        } else {
          return Promise.resolve(false);
        }
      });
  }

  /**
   * Checks if a user can mulligan any daily quests.
   * @public
   * @param  {String}  userId          User ID for which to check.
   * @param  {String}  questIndex        Quest index to mulligan.
   * @param  {Moment}  systemTime        Pass in the current system time to use to generate quests. Used mostly for testing.
   * @param  {Integer}  replaceWithQuestId    The specific SDK quest ID to replace the quest with. Used mostly for testing.
   * @return  {Promise}              Promise that will post the mulliganed quest data.
   */
  static mulliganDailyQuest(userId, questIndex, systemTime, replaceWithQuestId) {
    // userId must be defined
    if (!userId) {
      return Promise.reject(new Error(`Can not mulligan daily quests: invalid user ID - ${userId}`));
    }

    Logger.module('QuestsModule').time(`mulliganDailyQuest() -> mulliganed quest slot ${questIndex} by user ${userId.blue}.`.green);

    const MOMENT_NOW_UTC = systemTime || moment().utc();

    const this_obj = {};

    return knex.transaction(function (tx) {
      knex('user_quests').select().where({ user_id: userId }).transacting(tx)
        .forUpdate()
        .bind(this_obj)
        .then(function (questRows) {
          this.questRows = questRows;

          if ((questRows != null ? questRows.length : undefined) > 0) {
            const quest_ids_generated = [];

            for (var quest of Array.from(questRows)) {
              quest_ids_generated.push(quest.quest_type_id);
            }

            const questToMulligan = _.find(questRows, (q) => q.quest_slot_index === questIndex);

            Logger.module('QuestsModule').debug(`mulliganDailyQuest() -> About to mulliganing quest type ${questToMulligan.quest_type_id}. user ${userId.blue}.`);

            if (!(questToMulligan != null ? questToMulligan.is_replaceable : undefined)) {
              throw new Errors.BadRequestError('Can not mulligan this quest type');
            }

            if (questToMulligan != null) {
              if (questToMulligan.mulliganed_at) {
                const now_utc_val = MOMENT_NOW_UTC.valueOf();
                const mulliganed_at_val = moment.utc(questToMulligan.mulliganed_at).valueOf();
                const diff = now_utc_val - mulliganed_at_val;
                const duration = moment.duration(diff);

                if (duration.asHours() < 23) {
                  Logger.module('QuestsModule').error(`mulliganDailyQuest() -> Can not mulligan quest ${questIndex} because it's only been ${duration.asHours()} hours. user ${userId.blue}.`);
                  return Promise.reject(new Errors.QuestCantBeMulliganedError('This quest has already been mulliganed today'));
                }
              }

              const questToMulliganArrayIndex = _.indexOf(questRows, questToMulligan);

              Logger.module('QuestsModule').debug(`mulliganDailyQuest() -> Mulliganing quest ${questIndex}. user ${userId.blue}.`);

              const start_of_today_utc = MOMENT_NOW_UTC.clone().startOf('day').toDate();

              let quest1 = QuestFactory.randomQuestForSlotExcludingIds(questIndex, quest_ids_generated);

              // if we requested a SPECIFIC quest as a replacement, use that quest
              if (replaceWithQuestId != null) {
                quest1 = QuestFactory.questForIdentifier(replaceWithQuestId);
              }

              const questData = QuestsModule._questDataForQuest(quest1, MOMENT_NOW_UTC);
              questData.quest_slot_index = questIndex;
              questData.mulliganed_at = start_of_today_utc;
              questData.progressed_by_game_ids = [];

              this.questData = questData;

              questRows[questToMulliganArrayIndex] = questData;

              return knex('user_quests').where({ user_id: userId, quest_slot_index: questIndex }).update(questData).transacting(tx);
            } else {
              return Promise.reject(new Error(`No quest found at index ${questIndex}`));
            }
          }
        })
        .then(() => SyncModule._bumpUserTransactionCounter(tx, userId))
        .then(tx.commit)
        .catch(tx.rollback);
    }).bind(this_obj)
      .then(() => // Logger.module("QuestsModule").debug("mulliganDailyQuest() -> DONE. Saving FB.".green)

        DuelystFirebase.connect().getRootRef()).then(function (fbRootRef) {
      // update user firebase data
        const data = _.clone(this.questData);
        const slotIndex = data.quest_slot_index;
        delete data.quest_slot_index;
        delete data.user_id;
        data.created_at = moment.utc(data.created_at).valueOf();
        data.begin_at = moment.utc(data.begin_at).valueOf();
        if (data.mulliganed_at) { data.mulliganed_at = moment.utc(data.mulliganed_at).valueOf(); }
        if (data.updated_at) { data.updated_at = moment.utc(data.updated_at).valueOf(); }

        return FirebasePromises.set(fbRootRef.child('user-quests').child(userId).child('daily').child('current')
          .child('quests')
          .child(questIndex), data);
      })
      .then(function () {
        const toReturn = [];

        for (var quest of Array.from(this.questRows)) {
          toReturn[quest.quest_slot_index] = quest;
        }

        Logger.module('QuestsModule').timeEnd(`mulliganDailyQuest() -> mulliganed quest slot ${questIndex} by user ${userId.blue}.`.green);

        return toReturn;
      });
  }

  /**
   * Update quest progress for a user given a game.
   * @public
   * @param  {String}    userId      User ID for which to process quests.
   * @param   {String}    gameId       Game ID for which to calculate quest progress.
   * @param  {String}    gameSession   Full game session data for which to calculate quest progress.
   * @param  {Moment}    systemTime    Pass in the current system time to use to generate quests. Used only for testing.
   * @return  {Promise}            Promise that will post { quests:[] rewards:[] } on completion.
   */
  static updateQuestProgressWithGame(userId, gameId, gameSessionData, systemTime) {
    // userId or gameId must be defined
    if (!userId || !gameId) {
      return Promise.reject(new Error(`Can not update quest progress : invalid user ID - ${userId} - or game ID - ${gameId}`));
    }
    if (!gameSessionData) {
      return Promise.reject(new Error('Invalid game session data'));
    }

    Logger.module('QuestsModule').time(`updateQuestProgressWithGame() -> for game ${gameId} by user ${userId.blue}.`.green);

    const MOMENT_NOW_UTC = systemTime || moment().utc();

    const this_obj = {};

    var txPromise = knex.transaction((tx) => Promise.resolve(tx('users').where({ id: userId }).first('id').forUpdate())
      .bind(this_obj)
      .then((userRow) => Promise.all([
        userRow,
        tx('user_quests').select().where({ user_id: userId }).forUpdate(),
      ])).spread(function (userRow, questRows) {
      // Logger.module("QuestsModule").debug "updateQuestProgressWithGame() -> ACQUIRED LOCK ON #{userId}".yellow

        this.userRow = userRow;
        this.questRows = questRows;

        if ((questRows != null ? questRows.length : undefined) > 0) {
          let quest;
          const allQueries = [];

          for (quest of Array.from(questRows)) {
            try {
            // generate a quest model object based on quest ID
              var questModel = QuestFactory.questForIdentifier(quest.quest_type_id);

              // check if game and player satisfied this class of quest
              var progressAmount = questModel.progressForGameDataForPlayerId(gameSessionData, userId);

              if (progressAmount > 0) {
              // track which games progressed a quest,
                if (quest.progressed_by_game_ids == null) { quest.progressed_by_game_ids = []; }
                quest.progressed_by_game_ids.push(gameId);

                if (quest.progress == null) { quest.progress = 0; }
                allQueries.push(QuestsModule._setQuestProgress(txPromise, tx, quest, quest.progress + progressAmount, gameId, MOMENT_NOW_UTC));
              } else {
                Logger.module('QuestsModule').debug(`updateQuestProgressWithGame() -> quest[${quest.quest_slot_index}] NOT satisfied: ${questModel.getName()} User ${userId.blue}. Game [G:${gameId}].`.yellow);
              }
            } catch (e) {
              Logger.module('QuestsModule').debug('updateQuestProgressWithGame() -> caught ERROR processing QUEST DATA'.red, e);
              return Promise.reject(new Error('ERROR PROCESSING QUEST DATA'));
              break;
            }
          }

          // check for any completed quests and if we need to progress "quest based" quests
          for (quest of Array.from(questRows)) {
            if (quest.completed_at) {
              var completedQuest = quest;
              // if any "quest completion" quests need to be progressed
              allQueries.push(QuestsModule.updateQuestProgressWithCompletedQuest(txPromise, tx, completedQuest.user_id, gameId, completedQuest.quest_type_id, questRows));
            }
          }

          return Promise.all(allQueries);
        } else {
        // no quests, no need to update anything
          return Promise.resolve();
        }
      })
      .then(function (rewards) { return this.rewards = _.flatten(_.compact(rewards)); })
      .then(() => SyncModule._bumpUserTransactionCounter(tx, userId))
      .timeout(10000)
      .catch(Promise.TimeoutError, function (e) {
        Logger.module('QuestsModule').error(`updateQuestProgressWithGame() -> ERROR, operation timeout for u:${userId} g:${gameId}`);
        throw e;
      })).bind(this_obj)
      .then(function () {
        const quests = [];

        for (var quest of Array.from(this.questRows)) {
          quests[quest.quest_slot_index] = quest;
        }

        const toReturn = {
          quests,
          rewards: this.rewards,
        };

        Logger.module('QuestsModule').timeEnd(`updateQuestProgressWithGame() -> for game ${gameId} by user ${userId.blue}.`.green);

        return toReturn;
      }).finally(() => GamesModule.markClientGameJobStatusAsComplete(userId, gameId, 'quests'));

    return txPromise;
  }

  /**
   * Update quest progress for a user given a completed challenge.
   * @public
   * @param  {Promise}    txPromise    Transaction promise that resolves if transaction succeeds.
   * @param  {Transaction}  tx        KNEX transaction to attach this operation to.
   * @param  {String}    userId      User ID for which to process quests.
   * @param   {String}    challengeId   Challenge ID for which to calculate quest progress.
   * @param  {Moment}    systemTime    Pass in the current system time to use to generate quests. Used only for testing.
   * @return  {Promise}            Promise that will post { quests:[] rewards:[] } on completion.
   */
  static updateQuestProgressWithCompletedChallenge(txPromise, tx, userId, challengeId, systemTime) {
    // userId or challengeId must be defined
    if (!userId || !challengeId) {
      return Promise.reject(new Error(`Can not update quest progress : invalid user ID - ${userId} - or challenge ID - ${challengeId}`));
    }

    Logger.module('QuestsModule').time(`updateQuestProgressWithCompletedChallenge() -> for challenge ${challengeId} by user ${userId.blue}.`.green);

    const MOMENT_NOW_UTC = systemTime || moment().utc();

    const this_obj = {};

    return Promise.all([
      tx('users').where({ id: userId }).first('id').forUpdate(),
      tx('user_quests').select().where({ user_id: userId }).forUpdate(),
    ])
      .bind({})
      .spread(function (userRow, questRows) {
        this.userRow = userRow;
        this.questRows = questRows;

        if ((questRows != null ? questRows.length : undefined) > 0) {
          const allQueries = [];

          for (var quest of Array.from(questRows)) {
            try {
            // generate a quest model object based on quest ID
              var questModel = QuestFactory.questForIdentifier(quest.quest_type_id);

              // check if game and player satisfied this class of quest
              var progressAmount = questModel.progressForChallengeId(challengeId);

              if (progressAmount > 0) {
                if (quest.progress == null) { quest.progress = 0; }
                allQueries.push(QuestsModule._setQuestProgress(txPromise, tx, quest, quest.progress + progressAmount, null, MOMENT_NOW_UTC));
              } else {
                Logger.module('QuestsModule').debug(`updateQuestProgressWithCompletedChallenge() -> quest[${quest.quest_slot_index}] NOT satisfied: ${questModel.getName()} User ${userId.blue}. Challenge: ${challengeId}.`.yellow);
              }
            } catch (e) {
              Logger.module('QuestsModule').debug('updateQuestProgressWithCompletedChallenge() -> caught ERROR processing QUEST DATA'.red, e);
              return Promise.reject(new Error('ERROR PROCESSING QUEST DATA'));
              break;
            }
          }

          return Promise.all(allQueries);
        } else {
        // no quests, no need to update anything
          return Promise.resolve();
        }
      }).then(function (rewards) { return this.rewards = _.flatten(_.compact(rewards)); })
      .then(function () {
        const quests = [];

        for (var quest of Array.from(this.questRows)) {
          quests[quest.quest_slot_index] = quest;
        }

        const toReturn = {
          quests,
          rewards: this.rewards,
        };

        Logger.module('QuestsModule').timeEnd(`updateQuestProgressWithCompletedChallenge() -> for challenge ${challengeId} by user ${userId.blue}.`.green);

        return toReturn;
      });
  }

  /**
   * Update quest progress for a user given a completed quest.
   * @public
   * @param  {Promise}    txPromise    Transaction promise that resolves if transaction succeeds.
   * @param  {Transaction}  tx        KNEX transaction to attach this operation to.
   * @param  {String}    userId      User ID for which to process quests.
   * @param   {String}    questId     Quest ID for which to calculate quest progress.
   * @param  {Moment}    systemTime    Pass in the current system time to use to generate quests. Used only for testing.
   * @return  {Promise}            Promise that will post { quests:[] rewards:[] } on completion.
   */
  static updateQuestProgressWithCompletedQuest(txPromise, tx, userId, gameId, questId, questRows, systemTime) {
    // userId or questId must be defined
    if (!userId || !questId) {
      return Promise.reject(new Error(`Can not update quest progress : invalid user ID - ${userId} - or quest ID - ${questId}`));
    }

    Logger.module('QuestsModule').time(`updateQuestProgressWithCompletedQuest() -> for user ${userId.blue}.`.green);

    const MOMENT_NOW_UTC = systemTime || moment().utc();

    const this_obj = {};

    return Promise.resolve()
      .bind({})
      .then(function () {
        this.questRows = questRows;
        if ((questRows != null ? questRows.length : undefined) > 0) {
          const allQueries = [];

          for (var quest of Array.from(questRows)) {
            try {
            // generate a quest model object based on quest ID
              var questModel = QuestFactory.questForIdentifier(quest.quest_type_id);

              // a completed quest based quest can not progress itself
              if (quest.quest_type_id === questId) {
                continue;
              }

              // check if game and player satisfied this class of quest
              var progressAmount = questModel.progressForQuestCompletion(questId);

              if (progressAmount > 0) {
                if (quest.progress == null) { quest.progress = 0; }
                allQueries.push(QuestsModule._setQuestProgress(txPromise, tx, quest, quest.progress + progressAmount, gameId, MOMENT_NOW_UTC));
              } else {
                Logger.module('QuestsModule').debug(`updateQuestProgressWithCompletedQuest() -> quest[${quest.quest_slot_index}] NOT satisfied: ${questModel.getName()} User ${userId.blue}.`.yellow);
              }
            } catch (e) {
              Logger.module('QuestsModule').debug('updateQuestProgressWithCompletedQuest() -> caught ERROR processing QUEST DATA'.red, e);
              return Promise.reject(new Error('ERROR PROCESSING QUEST DATA'));
              break;
            }
          }

          return Promise.all(allQueries);
        } else {
        // no quests, no need to update anything
          return Promise.resolve();
        }
      }).then(function (rewards) { return this.rewards = _.flatten(_.compact(rewards)); })
      .then(function () {
        const quests = {};

        for (var quest of Array.from(this.questRows)) {
          quests[quest.quest_slot_index] = quest;
        }

        const toReturn = {
          quests,
          rewards: this.rewards,
        };

        Logger.module('QuestsModule').timeEnd(`updateQuestProgressWithCompletedQuest() -> for user ${userId.blue}.`.green);

        return toReturn;
      });
  }

  /**
   * Update quest progress for a user given a completed challenge.
   * @public
   * @param  {Promise}    txPromise    Transaction promise that resolves if transaction succeeds.
   * @param  {Transaction}  tx        KNEX transaction to attach this operation to.
   * @param  {String}    userId      User ID for which to process quests.
   * @param   {JSON data}    progressedFactionData   Data for a single faction's progression !!Assumed to have leveled!!
   * @param  {Moment}    systemTime    Pass in the current system time to use to generate quests. Used only for testing.
   * @return  {Promise}            Promise that will post { quests:[] rewards:[] } on completion.
   */
  static updateQuestProgressWithProgressedFactionData(txPromise, tx, userId, progressedFactionData, systemTime) {
    // userId or challengeId must be defined
    if (!userId) {
      return Promise.reject(new Error(`Can not update quest progress for faction data : invalid user ID - ${userId}`));
    }

    if (!progressedFactionData) {
      return Promise.reject(new Error('Can not update quest progress for faction data : invalid faction data'));
    }

    const factionId = progressedFactionData.faction_id;

    if ((factionId == null)) {
      return Promise.reject(new Error('Can not update quest progress for faction data : invalid faction data - missing faction id'));
    }

    Logger.module('QuestsModule').time(`updateQuestProgressWithProgressedFactionData() -> for faction id ${factionId} by user ${userId.blue}.`.green);

    const MOMENT_NOW_UTC = systemTime || moment().utc();

    const this_obj = {};

    return Promise.all([
      tx('users').where({ id: userId }).first('id').forUpdate(),
      tx('user_quests').select().where({ user_id: userId }).forUpdate(),
    ])
      .bind({})
      .spread(function (userRow, questRows) {
        this.userRow = userRow;
        this.questRows = questRows;
        if ((questRows != null ? questRows.length : undefined) > 0) {
          const allQueries = [];
          for (var quest of Array.from(questRows)) {
            try {
            // generate a quest model object based on quest ID
              var questModel = QuestFactory.questForIdentifier(quest.quest_type_id);

              // check if game and player satisfied this class of quest
              var progressAmount = questModel.progressForProgressedFactionData(progressedFactionData);
              if (progressAmount > 0) {
                if (quest.progress == null) { quest.progress = 0; }
                allQueries.push(QuestsModule._setQuestProgress(txPromise, tx, quest, quest.progress + progressAmount, null, MOMENT_NOW_UTC));
              } else {
                Logger.module('QuestsModule').debug(`updateQuestProgressWithProgressedFactionData() -> quest[${quest.quest_slot_index}] NOT satisfied: ${questModel.getName()} User ${userId.blue}. Faction id: ${factionId}.`.yellow);
              }
            } catch (e) {
              Logger.module('QuestsModule').debug('updateQuestProgressWithProgressedFactionData() -> caught ERROR processing QUEST DATA'.red, e);
              return Promise.reject(new Error('ERROR PROCESSING QUEST DATA'));
              break;
            }
          }

          return Promise.all(allQueries);
        } else {
        // no quests, no need to update anything
          return Promise.resolve();
        }
      }).then(function (rewards) { return this.rewards = _.flatten(_.compact(rewards)); })
      .then(function () {
        const quests = [];
        for (var quest of Array.from(this.questRows)) {
          quests[quest.quest_slot_index] = quest;
        }

        const toReturn = {
          quests,
          rewards: this.rewards,
        };

        Logger.module('QuestsModule').timeEnd(`updateQuestProgressWithProgressedFactionData() -> for faction id ${factionId} by user ${userId.blue}.`.green);
        return toReturn;
      });
  }

  /**
   * Set quest progress.
   * @private
   * @param  {Promise}    txPromise      Transaction promise that resolves if transaction succeeds.
   * @param  {Transaction}  tx          KNEX transaction to attach this operation to.
   * @param  {Object}    quest        Quest data.
   * @param   {Number}    progressAmount     What to set the progress to.
   * @param  {String}    gameId         Game ID (if any).
   * @param  {Moment}    systemTime      Pass in the current system time to use to generate quests. Used only for testing.
   * @return  {Promise}              Promise.
   */
  static _setQuestProgress(txPromise, tx, quest, progressAmount, gameId, systemTime) {
    const MOMENT_NOW_UTC = systemTime || moment().utc();

    const questModel = QuestFactory.questForIdentifier(quest.quest_type_id);

    const rewards = [];
    const allQueries = [];

    // if the quest is already past the completion point just resolve
    if (quest.progress >= quest.params.completionProgress) {
      return Promise.resolve();
    }

    if (progressAmount > 0) {
      quest.progress = progressAmount;
      quest.updated_at = MOMENT_NOW_UTC.toDate();

      // Check if a quest has been completed to award gold and clear from current quests
      if (quest.progress >= quest.params.completionProgress) {
        Logger.module('QuestsModule').debug(`_setQuestProgress() -> quest[${quest.quest_slot_index}] COMPLETED at ${quest.progress}/${quest.params.completionProgress}: ${questModel.getName()}. User ${quest.user_id.blue}. For [G:${gameId}].`.cyan);

        // note: completion count used to be used to "ding" quests that can be completed multiple times
        // quest.completion_count ?= 0
        // quest.completion_count += 1

        quest.completed_at = MOMENT_NOW_UTC.toDate();
        quest.progress = quest.params.completionProgress; // don't allow progress to go above max (ex: 21/20)

        allQueries.push(tx('user_quests').where({ user_id: quest.user_id, quest_slot_index: quest.quest_slot_index }).delete());

        const completedQuest = _.clone(quest);
        completedQuest.id = generatePushId();

        allQueries.push(tx('user_quests_complete').insert(completedQuest));

        const reward = {
          id: generatePushId(),
          user_id: quest.user_id,
          reward_category: 'quest',
          source_id: completedQuest.id,
          quest_type_id: completedQuest.quest_type_id,
          game_id: gameId,
          gold: quest.gold,
          spirit_orbs: quest.spirit_orbs,
          gift_chests: questModel.giftChests,
          cosmetic_keys: questModel.cosmeticKeys,
          created_at: quest.completed_at,
          is_unread: true,
        };

        rewards.push(reward);

        // insert reward into user table
        if (gameId) {
          allQueries.push(GamesModule._addRewardIdToUserGame(tx, quest.user_id, gameId, reward.id));
        }

        allQueries.push(tx('user_rewards').insert(reward));

        if (quest.gold) {
          // update user gold
          allQueries.push(InventoryModule.giveUserGold(txPromise, tx, quest.user_id, quest.gold, 'daily quest', completedQuest.id));
        }

        if (quest.spirit_orbs) {
          // add booster to user
          allQueries.push(InventoryModule.addBoosterPackToUser(txPromise, tx, quest.user_id, 1, 'daily quest', completedQuest.id));
        }

        if (QuestFactory.questForIdentifier(quest.quest_type_id).giftChests != null) {
          // add gift chests to user
          for (var type of Array.from(QuestFactory.questForIdentifier(quest.quest_type_id).giftChests)) {
            allQueries.push(GiftCrateModule.addGiftCrateToUser(txPromise, tx, quest.user_id, type));
          }
        }

        if (QuestFactory.questForIdentifier(quest.quest_type_id).cosmeticKeys != null) {
          // add cosmetic keys to user
          for (var cosmeticKeyType of Array.from(QuestFactory.questForIdentifier(quest.quest_type_id).cosmeticKeys)) {
            // allQueries.push(GiftCrateModule.addGiftCrateToUser(txPromise, tx, quest.user_id, type))
            allQueries.push(CosmeticChestsModule.giveUserChestKey(txPromise, tx, quest.user_id, cosmeticKeyType, 1, 'daily quest', completedQuest.id));
          }
        }

        // Kick off a job to update user's quest achievements
        // TODO: should catch up quests advance achievements
        Jobs.create('update-user-achievements', {
          name: 'Update User Quest Achievements',
          title: util.format('User %s :: Update Quest Achievements', quest.user_id),
          userId: quest.user_id,
          completedQuestId: completedQuest.quest_type_id,
        },
        ).removeOnComplete(true).save();
      } else {
        Logger.module('QuestsModule').debug(`_setQuestProgress() -> quest[${quest.quest_slot_index}] progressed to ${quest.progress}/${quest.params.completionProgress}: ${questModel.getName()}. User ${quest.user_id.blue}. Game [G:${gameId}].`.cyan);

        allQueries.push(
          tx('user_quests').where({ user_id: quest.user_id, quest_slot_index: quest.quest_slot_index }).update({
            progress: quest.progress,
            progressed_by_game_ids: quest.progressed_by_game_ids,
            updated_at: quest.updated_at,
          }),
        );
      }

    // Checks if a quest's progress should be reset, such as in the case of a broken streak
    } else if (questModel.shouldResetProgress(gameSessionData, progressAmount)) {
      Logger.module('QuestsModule').debug(`_setQuestProgress() -> quest[${quest.quest_slot_index}] progress is reset: ${questModel.getName()} User ${quest.user_id.blue}. Game [G:${gameId}].`.yellow);

      quest.progress = 0;
      quest.updated_at = MOMENT_NOW_UTC.valueOf();

      allQueries.push(
        tx('user_quests').where({ user_id: quest.user_id, quest_slot_index: quest.quest_slot_index }).update({
          progress: 0,
          updated_at: moment().utc().getDate(),
        }),
      );
    } else {
      Logger.module('QuestsModule').debug(`_setQuestProgress() -> quest[${quest.quest_slot_index}] NOT satisfied: ${questModel.getName()} User ${quest.user_id.blue}. Game [G:${gameId}].`.yellow);
    }

    return Promise.all(allQueries)
      .bind({})
      .then(function () { return this.rewards = rewards; })
      .then(() => DuelystFirebase.connect().getRootRef())
      .then(function (fbRootRef) {
        const allPromises = [];

        if (quest.completed_at) {
        // remove complete quest from Firebase
          allPromises.push(FirebasePromises.remove(fbRootRef.child('user-quests').child(quest.user_id).child('daily').child('current')
            .child('quests')
            .child(quest.quest_slot_index)));
        } else {
          const slotIndex = quest.quest_slot_index;
          // update quest progress in Firebase
          const data = _.clone(quest);
          delete data.quest_slot_index;
          delete data.user_id;
          data.created_at = moment.utc(data.created_at).valueOf();
          data.begin_at = moment.utc(data.begin_at).valueOf();
          if (data.mulliganed_at) { data.mulliganed_at = moment.utc(data.mulliganed_at).valueOf(); }
          if (data.updated_at) { data.updated_at = moment.utc(data.updated_at).valueOf(); }
          allPromises.push(FirebasePromises.set(fbRootRef.child('user-quests').child(quest.user_id).child('daily').child('current')
            .child('quests')
            .child(slotIndex), data));
        }

        // for reward in @.rewards
        //   reward_id = reward.id
        //   delete reward.user_id
        //   delete reward.id
        //   # push rewards to firebase tree
        //   allPromises.push(FirebasePromises.set(fbRootRef.child("user-rewards").child(userId).child(reward_id),reward))

        return Promise.all(allPromises);
      })
      .then(function () { return this.rewards; });
  }

  /**
   * Set quest progress.
   * @private
   * @param  {Promise}    txPromise      Transaction promise that resolves if transaction succeeds.
   * @param  {Transaction}  tx          KNEX transaction to attach this operation to.
   * @param  {String}  userId          User ID to give catch up charge to
   * @param   {Integer}    numCharges       How many charges to give
   * @param  {Moment}    systemTime    Pass in the current system time to use to generate quests. Used only for testing.
   * @return  {Promise}              Promise.
   */
  static _giveUserCatchUpQuestCharge(txPromise, tx, userId, numCharges, systemTime) {
    const MOMENT_NOW_UTC = systemTime || moment().utc();

    Logger.module('QuestsModule').debug(`_giveUserCatchUpQuestCharge() -> User ${userId.blue} receiving ${numCharges} quest catch up charges.`.cyan);

    const this_obj = {};

    return knex('user_quests').transacting(tx).forUpdate().select()
      .where({ user_id: userId })
      .bind(this_obj)
      .then(function (userQuestRows) {
        this.userQuestRows = userQuestRows;
        // Find the row for the catchup quest if it exists
        this.userCatchUpQuestRow = _.find(userQuestRows, function (userQuestRow) {
          const sdkQuest = QuestFactory.questForIdentifier(userQuestRow.quest_type_id);
          return (sdkQuest != null) && sdkQuest.isCatchUp;
        });

        const sdkQuest = QuestFactory.questForIdentifier();

        this.needsInsert = false; // whether catch up quest row requires insert or update
        if ((this.userCatchUpQuestRow == null)) {
          this.needsInsert = true;
          this.userCatchUpQuestRow = QuestsModule._questDataForQuest(QuestFactory.questForIdentifier(QuestCatchUp.Identifier), MOMENT_NOW_UTC);

          this.userCatchUpQuestRow.gold = 0;
          this.userCatchUpQuestRow.user_id = userId;
          this.userCatchUpQuestRow.quest_slot_index = QuestsModule.CATCH_UP_QUEST_SLOT;
        }

        // update gold in the catch up quest's row
        this.needsUpdate = false;
        if (this.userCatchUpQuestRow.gold <= QuestsModule.CATCH_UP_MAX_GOLD_VALUE) {
          this.needsUpdate = true;
          this.userCatchUpQuestRow.gold = Math.min(this.userCatchUpQuestRow.gold + (numCharges * QuestsModule.CATCH_UP_CHARGE_GOLD_VALUE), QuestsModule.CATCH_UP_MAX_GOLD_VALUE);
        }

        // Write to firebase after transaction is done, if needed
        if (this.needsUpdate || this.needsInsert) {
          txPromise.then(() => DuelystFirebase.connect().getRootRef()).then((fbRootRef) => {
            const allPromises = [];

            const fbUserCatchUpQuestData = _.clone(this.userCatchUpQuestRow);
            const slotIndex = fbUserCatchUpQuestData.quest_slot_index;
            delete fbUserCatchUpQuestData.quest_slot_index;
            delete fbUserCatchUpQuestData.user_id;
            fbUserCatchUpQuestData.created_at = moment.utc(fbUserCatchUpQuestData.created_at).valueOf();
            fbUserCatchUpQuestData.begin_at = moment.utc(fbUserCatchUpQuestData.begin_at).valueOf();
            if (fbUserCatchUpQuestData.mulliganed_at) { fbUserCatchUpQuestData.mulliganed_at = moment.utc(fbUserCatchUpQuestData.mulliganed_at).valueOf(); }
            if (fbUserCatchUpQuestData.updated_at) { fbUserCatchUpQuestData.updated_at = moment.utc(fbUserCatchUpQuestData.updated_at).valueOf(); }

            allPromises.push(
              FirebasePromises.set(fbRootRef.child('user-quests').child(userId).child('daily').child('current')
                .child('quests')
                .child(slotIndex), fbUserCatchUpQuestData),
              FirebasePromises.set(fbRootRef.child('user-quests').child(userId).child('daily').child('current')
                .child('updated_at'), MOMENT_NOW_UTC.valueOf()),
            );

            return Promise.all(allPromises);
          });
        }

        if (this.needsInsert) {
          Logger.module('QuestsModule').debug(`_giveUserCatchUpQuestCharge() -> Inserting new catch up quest for user ${userId.blue}.`.cyan);
          return knex.insert(this.userCatchUpQuestRow).into('user_quests').transacting(tx);
        } else if (this.needsUpdate) {
          Logger.module('QuestsModule').debug(`_giveUserCatchUpQuestCharge() -> Updating current catch up quest for user ${userId.blue}.`.cyan);
          return knex('user_quests').where({ user_id: userId, quest_slot_index: QuestsModule.CATCH_UP_QUEST_SLOT }).update(this.userCatchUpQuestRow).transacting(tx);
        } else {
          return Promise.resolve();
        }
      })
      .then(function () {
        return this.userCatchUpQuestRow;
      });
  }
}
QuestsModule.initClass();

module.exports = QuestsModule;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
