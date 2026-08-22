/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const util = require('util');
const FirebasePromises = require('../firebase_promises');
const DuelystFirebase = require('../duelyst_firebase_module');
const fbUtil = require('@duelyst/common/utils/utils_firebase');
const Logger = require('@duelyst/common/logger');
const colors = require('colors');
const moment = require('moment');
const _ = require('underscore');
const CONFIG = require('@duelyst/common/config');
const Errors = require('../custom_errors');
const knex = require('./knex');
const config = require('../../../config/config.js');
const generatePushId = require('@duelyst/common/generate_push_id');
const DataAccessHelpers = require('./helpers');
const InventoryModule = require('./inventory');
const semver = require('semver');

// SDK imports
const SDK = require('@duelyst/sdk');
const QuestFactory = require('@duelyst/sdk/quests/questFactory');
const QuestType = require('@duelyst/sdk/quests/questTypeLookup');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const CosmeticsLookup = require('@duelyst/sdk/cosmetics/cosmeticsLookup');
const PromiseUtils = require('@duelyst/common/utils/utils_promise');

/*
 * The emote set as it existed BEFORE the 2016-07-08 cosmetics patch.
 *
 * Exported because it is the only correct expectation for the migration: it
 * is a fixed historical list, not "all faction emotes". The integration suite
 * used to derive its expectation from SDK.CosmeticsLookup.Emote instead, which
 * has grown from 66 faction emotes to 198 since, so the test demanded 126 while
 * the migration correctly granted 60.
 */
const EMOTE_IDS_PRE_COSMETICS_20160708 = [
  CosmeticsLookup.Emote.Faction1Taunt,
  CosmeticsLookup.Emote.Faction1Angry,
  CosmeticsLookup.Emote.Faction1Confused,
  CosmeticsLookup.Emote.Faction1Sad,
  CosmeticsLookup.Emote.Faction1Frustrated,
  CosmeticsLookup.Emote.Faction1Surprised,
  CosmeticsLookup.Emote.Faction1Bow,
  CosmeticsLookup.Emote.Faction1Sleep,
  CosmeticsLookup.Emote.Faction1Sunglasses,
  CosmeticsLookup.Emote.Faction1Kiss,
  // CosmeticsLookup.Emote.Faction1Happy
  CosmeticsLookup.Emote.Faction2Taunt,
  CosmeticsLookup.Emote.Faction2Happy,
  CosmeticsLookup.Emote.Faction2Confused,
  CosmeticsLookup.Emote.Faction2Sad,
  CosmeticsLookup.Emote.Faction2Frustrated,
  CosmeticsLookup.Emote.Faction2Surprised,
  CosmeticsLookup.Emote.Faction2Bow,
  CosmeticsLookup.Emote.Faction2Sleep,
  CosmeticsLookup.Emote.Faction2Sunglasses,
  CosmeticsLookup.Emote.Faction2Kiss,
  // CosmeticsLookup.Emote.Faction2Angry
  CosmeticsLookup.Emote.Faction3Taunt,
  CosmeticsLookup.Emote.Faction3Happy,
  CosmeticsLookup.Emote.Faction3Angry,
  CosmeticsLookup.Emote.Faction3Sad,
  CosmeticsLookup.Emote.Faction3Frustrated,
  CosmeticsLookup.Emote.Faction3Surprised,
  CosmeticsLookup.Emote.Faction3Bow,
  CosmeticsLookup.Emote.Faction3Sleep,
  CosmeticsLookup.Emote.Faction3Sunglasses,
  CosmeticsLookup.Emote.Faction3Kiss,
  // CosmeticsLookup.Emote.Faction3Confused
  CosmeticsLookup.Emote.Faction4Taunt,
  CosmeticsLookup.Emote.Faction4Happy,
  CosmeticsLookup.Emote.Faction4Angry,
  CosmeticsLookup.Emote.Faction4Confused,
  CosmeticsLookup.Emote.Faction4Sad,
  CosmeticsLookup.Emote.Faction4Surprised,
  CosmeticsLookup.Emote.Faction4Bow,
  CosmeticsLookup.Emote.Faction4Sleep,
  CosmeticsLookup.Emote.Faction4Sunglasses,
  CosmeticsLookup.Emote.Faction4Kiss,
  // CosmeticsLookup.Emote.Faction4Frustrated
  CosmeticsLookup.Emote.Faction5Taunt,
  CosmeticsLookup.Emote.Faction5Happy,
  CosmeticsLookup.Emote.Faction5Angry,
  CosmeticsLookup.Emote.Faction5Confused,
  CosmeticsLookup.Emote.Faction5Frustrated,
  CosmeticsLookup.Emote.Faction5Surprised,
  CosmeticsLookup.Emote.Faction5Bow,
  CosmeticsLookup.Emote.Faction5Sleep,
  CosmeticsLookup.Emote.Faction5Sunglasses,
  CosmeticsLookup.Emote.Faction5Kiss,
  // CosmeticsLookup.Emote.Faction5Sad
  CosmeticsLookup.Emote.Faction6Frustrated,
  CosmeticsLookup.Emote.Faction6Happy,
  CosmeticsLookup.Emote.Faction6Angry,
  CosmeticsLookup.Emote.Faction6Confused,
  CosmeticsLookup.Emote.Faction6Sad,
  CosmeticsLookup.Emote.Faction6Surprised,
  CosmeticsLookup.Emote.Faction6Bow,
  CosmeticsLookup.Emote.Faction6Sleep,
  CosmeticsLookup.Emote.Faction6Sunglasses,
  CosmeticsLookup.Emote.Faction6Taunt,
  // CosmeticsLookup.Emote.Faction6Kiss
];

class MigrationsModule {
  // region PER USER MIGRATIONS

  /**
   * Checks if a user needs to have the emotes -> cosmetics migration
   * @private
   * @param  {Object}  userRow      the user's current db row (specifically needs last_session_at and created_at)
   * @return  {Promise}              Promise that will resolve to true or false
   */
  static checkIfUserNeedsMigrateEmotes20160708(userRow) {
    const migrationDeadlineMoment = moment.utc('2016-07-22 03:30');
    let userLastSessionMoment = moment.utc(userRow.last_session_at);
    if (userRow.last_session_at == null) {
      userLastSessionMoment = moment.utc(userRow.created_at);
    }

    if (!userLastSessionMoment.isBefore(migrationDeadlineMoment)) {
      return Promise.resolve(false);
    } else {
      return knex('user_cosmetic_inventory')
        .first()
        .where('user_id', userRow.id)
        .andWhere('transaction_id', 'migration 20160708')
        .then(function (userCosmeticRow) {
          // Presence of any cosmetic rows means they don't need a migration
          if (userCosmeticRow != null) {
            return Promise.resolve(false);
          } else {
            return Promise.resolve(true);
          }
        });
    }
  }

  /**
   * Migrates a user's emotes from user_emotes table to user_cosmetic_inventory table
   * @private
   * @param  {String}  userId       userId to migration
   * @return  {Promise}              Promise that resolves on completion
   */
  static userMigrateEmotes20160708(userId, systemTime) {
    if (!userId) {
      Logger.module('MigrationsModule').debug(
        `userMigrateEmotes20160708() -> invalid user ID - ${userId}.`.red,
      );
      return Promise.reject(
        new Error(`Can not migrate emotes for user: invalid user ID - ${userId}`),
      );
    }

    const MOMENT_NOW_UTC = systemTime || moment().utc();

    Logger.module('MigrationsModule').debug(
      `userMigrateEmotes20160708() -> migrating emotes for user ${userId}`.green,
    );

    Logger.module('MigrationsModule').time(`userMigrateEmotes20160708() -> ${userId} done`.green);

    // Giving players all pre cosmetics emotes if they played before cosmetics patch
    const emoteIdsToGive = EMOTE_IDS_PRE_COSMETICS_20160708;

    var txPromise = knex
      .transaction(function (tx) {
        tx('users')
          .first('id')
          .where('id', userId)
          .forUpdate()
          .then(() =>
            PromiseUtils.map(emoteIdsToGive, function (emoteId) {
              const transactionType = 'migration gift';
              const transactionId = 'migration 20160708';

              return InventoryModule.giveUserCosmeticId(
                txPromise,
                tx,
                userId,
                emoteId,
                transactionType,
                transactionId,
                null,
                MOMENT_NOW_UTC,
              );
            }),
          )
          .then(() => tx('user_emotes').where('user_id', userId).select())
          .then(function (userEmoteRows) {
            let ownedUserEmotes = _.map(userEmoteRows, (userEmoteRow) => userEmoteRow.emote_id);
            // To be safe that no duplicates are given
            ownedUserEmotes = _.filter(
              ownedUserEmotes,
              (ownedUserEmoteId) => !_.contains(emoteIdsToGive, ownedUserEmoteId),
            );
            return PromiseUtils.map(ownedUserEmotes, function (emoteId) {
              const transactionType = 'migrated emote';
              const transactionId = 'migration 20160708';

              return InventoryModule.giveUserCosmeticId(
                txPromise,
                tx,
                userId,
                emoteId,
                transactionType,
                transactionId,
                null,
                MOMENT_NOW_UTC,
              );
            });
          })
          .then(() => tx('user_emotes').where('user_id', userId).delete())
          .then(() => DuelystFirebase.connect().getRootRef())
          .then((fbRootRef) =>
            FirebasePromises.remove(
              fbRootRef.child('user-inventory').child(userId).child('emotes'),
            ),
          )
          .then(tx.commit)
          .catch(tx.rollback);
      })
      .then(() =>
        Logger.module('MigrationsModule').timeEnd(
          `userMigrateEmotes20160708() -> ${userId} done`.green,
        ),
      );
    return txPromise;
  }

  /**
   * Checks if a user needs to be given prismatic rewards based on spirit orbs opened prior to prismatic feature
   * @private
   * @param  {Object}  userRow      the user's current db row (specifically needs last_session_version)
   * @return  {Promise}              Promise that will resolve to true or false (This doesn't require a promise but this is keeps convention)
   */
  static checkIfUserNeedsPrismaticBackfillReward(userRow) {
    const prismaticBackFillVersion = '1.73.0';

    let userLastSessionVersion = userRow.last_session_version;

    if (userLastSessionVersion == null) {
      userLastSessionVersion = '0.0.0';
    }

    if (semver.gte(userLastSessionVersion, prismaticBackFillVersion)) {
      return Promise.resolve(false);
    } else {
      // Safety check to make sure no user will get rewards even if version check fails
      return knex('user_card_log')
        .first('source_type')
        .where('user_id', userRow.id)
        .andWhere('source_type', 'prismatic backfill')
        .then(function (userCardLogRow) {
          // Presence of any card log rows with 'prismatic backfill' means they don't need a migration
          if (userCardLogRow != null) {
            return Promise.resolve(false);
          } else {
            return Promise.resolve(true);
          }
        });
    }
  }

  /**
   * Migrates a user's emotes from user_emotes table to user_cosmetic_inventory table
   * @private
   * @param  {String}  userId       userId to migration
   * @return  {Promise}              Promise that resolves on completion
   */
  static userBackfillPrismaticRewards(userId, systemTime) {
    if (!userId) {
      Logger.module('MigrationsModule').debug(
        `userBackfillPrismaticRewards() -> invalid user ID - ${userId}.`.red,
      );
      return Promise.reject(
        new Error(`Can not backfill prismatic for user: invalid user ID - ${userId}`),
      );
    }

    const MOMENT_NOW_UTC = systemTime || moment().utc();

    // Transaction identifiers to user for giving prismatics
    const sourceType = 'prismatic backfill';
    const sourceId = 'migration 20160815';

    // Prismatics were added around Thursday, 21 July 2016 at 6:00:00 PM UTC
    const prismaticFeatureAddedMoment = moment.utc('2016-07-21 20:00'); // 2 Hours extra time just in case

    Logger.module('MigrationsModule').debug(
      `userBackfillPrismaticRewards() -> backfilling prismatics for user ${userId}`.green,
    );

    Logger.module('MigrationsModule').time(
      `userBackfillPrismaticRewards() -> ${userId} done`.green,
    );

    var txPromise = knex
      .transaction(function (tx) {
        tx('users')
          .first('id')
          .where('id', userId)
          .forUpdate()
          .then(() =>
            tx('user_spirit_orbs_opened')
              .count()
              .where('user_id', userId)
              .andWhere('opened_at', '<', prismaticFeatureAddedMoment.toDate()),
          )
          .then(function (countData) {
            let commonCards, epicCards, rareCards;
            const numSpiritOrbsOpened = parseInt(countData[0].count);

            Logger.module('MigrationsModule').debug(
              `userBackfillPrismaticRewards() -> user ${userId} opened ${numSpiritOrbsOpened} before prismatics`
                .green,
            );

            const cardsRewarded = [];

            if (numSpiritOrbsOpened < 20) {
              // Do nothing, there is no reward for less than 20
            } else if (numSpiritOrbsOpened < 50) {
              commonCards = SDK.GameSession.getCardCaches()
                .getRarity(SDK.Rarity.Common)
                .getIsUnlockable(false)
                .getIsCollectible(true)
                .getIsPrismatic(false)
                .getCards();
              rareCards = SDK.GameSession.getCardCaches()
                .getRarity(SDK.Rarity.Rare)
                .getIsUnlockable(false)
                .getIsCollectible(true)
                .getIsPrismatic(false)
                .getCards();
              epicCards = SDK.GameSession.getCardCaches()
                .getRarity(SDK.Rarity.Epic)
                .getIsUnlockable(false)
                .getIsCollectible(true)
                .getIsPrismatic(false)
                .getCards();
              // 2 common prismatics
              cardsRewarded.push(_.sample(commonCards));
              cardsRewarded.push(_.sample(commonCards));
              // 2 rare prismatics
              cardsRewarded.push(_.sample(rareCards));
              cardsRewarded.push(_.sample(rareCards));
              // 2 epic prismatics
              cardsRewarded.push(_.sample(epicCards));
              cardsRewarded.push(_.sample(epicCards));
            } else {
              const numRewardBlocks = Math.floor(numSpiritOrbsOpened / 50);
              commonCards = SDK.GameSession.getCardCaches()
                .getRarity(SDK.Rarity.Common)
                .getIsUnlockable(false)
                .getIsCollectible(true)
                .getIsPrismatic(false)
                .getCards();
              rareCards = SDK.GameSession.getCardCaches()
                .getRarity(SDK.Rarity.Rare)
                .getIsUnlockable(false)
                .getIsCollectible(true)
                .getIsPrismatic(false)
                .getCards();
              epicCards = SDK.GameSession.getCardCaches()
                .getRarity(SDK.Rarity.Epic)
                .getIsUnlockable(false)
                .getIsCollectible(true)
                .getIsPrismatic(false)
                .getCards();
              const legendaryCards = SDK.GameSession.getCardCaches()
                .getRarity(SDK.Rarity.Legendary)
                .getIsUnlockable(false)
                .getIsCollectible(true)
                .getIsPrismatic(false)
                .getCards();
              for (
                let i = 1, end = numRewardBlocks, asc = end >= 1;
                asc ? i <= end : i >= end;
                asc ? i++ : i--
              ) {
                // 4 common prismatics
                cardsRewarded.push(_.sample(commonCards));
                cardsRewarded.push(_.sample(commonCards));
                cardsRewarded.push(_.sample(commonCards));
                cardsRewarded.push(_.sample(commonCards));
                // 3 rare prismatics
                cardsRewarded.push(_.sample(rareCards));
                cardsRewarded.push(_.sample(rareCards));
                cardsRewarded.push(_.sample(rareCards));
                // 2 epic prismatics
                cardsRewarded.push(_.sample(epicCards));
                cardsRewarded.push(_.sample(epicCards));
                // 1 legendary prismatic
                cardsRewarded.push(_.sample(legendaryCards));
              }
            }

            const prismaticCardIdsRewarded = _.map(cardsRewarded, function (cardRewarded) {
              const baseCardId = cardRewarded.getBaseCardId();
              const prismaticCardId = SDK.Cards.getPrismaticCardId(baseCardId);
              return prismaticCardId;
            });

            Logger.module('MigrationsModule').debug(
              `userBackfillPrismaticRewards() -> user ${userId} received ${prismaticCardIdsRewarded.length} cards in prismatic backfill`
                .green,
            );

            return InventoryModule.giveUserCards(
              txPromise,
              tx,
              userId,
              prismaticCardIdsRewarded,
              sourceType,
              sourceId,
            );
          })
          .then(tx.commit)
          .catch(tx.rollback);
      })
      .then(() =>
        Logger.module('MigrationsModule').timeEnd(
          `userBackfillPrismaticRewards() -> ${userId} done`.green,
        ),
      );
    return txPromise;
  }

  /**
   * Checks if a user needs to be create purchase counter records in DB for products with purchase_limit
   * @private
   * @param  {Object}  userRow      the user's current db row (specifically needs last_session_version)
   * @return  {Promise}          Promise that will resolve to true or false (This doesn't require a promise but this is keeps convention)
   */
  static checkIfUserNeedsChargeCountsMigration(userRow) {
    const versionFeatureIntroduced = '1.74.11';
    const userLastSessionVersion = userRow.last_session_version || '0.0.0';

    if (semver.gte(userLastSessionVersion, versionFeatureIntroduced)) {
      return Promise.resolve(false);
    } else {
      return knex('users')
        .first('purchase_count')
        .where('id', userRow.id)
        .then(function (user) {
          const requiresMigration = user.purchase_count > 0;
          return Promise.resolve(requiresMigration);
        });
    }
  }

  /**
   * ...
   * @private
   * @param  {String}  userId       userId to migration
   * @return  {Promise}          Promise that resolves on completion
   */
  static userCreateChargeCountsMigration(userId, systemTime) {
    if (!userId) {
      Logger.module('MigrationsModule').debug(
        `userCreateChargeCountsMigration() -> invalid user ID - ${userId}.`.red,
      );
      return Promise.reject(
        new Error(`Can not backfill charge counts for user: invalid user ID - ${userId}`),
      );
    }

    const MOMENT_NOW_UTC = systemTime || moment().utc();
    Logger.module('MigrationsModule').time(
      `userCreateChargeCountsMigration() -> ${userId} done`.green,
    );

    const txPromise = knex
      .transaction((tx) =>
        // NOTE: because we don't have sku data for old products, we can't migrate anything other than starter bundle purchase count

        // return tx("user_charges").where("user_id",userId)
        // .bind {}
        // .then (chargeRows) ->
        //   allPromises = []
        //   @.purchaseCounts = {}
        //   for row in chargeRows
        //     if not row.sku
        //       row.sku = row.charge_json[""]
        //       allPromises.push tx("user_charges").where('charge_id',row.charge_id).update({ sku:row.sku })
        //     @.purchaseCounts[row.sku] ?= {}
        //     @.purchaseCounts[row.sku].count ?= 0
        //     @.purchaseCounts[row.sku].count += 1
        //   return Promise.all(allPromises)
        // .then ()-> return DuelystFirebase.connect().getRootRef()
        // .then (rootRef) -> return FirebasePromises.set(rootRef.child("user-purchase-counts").child(userId), @.purchaseCounts)

        Promise.all([
          tx('users').where('id', userId).first('has_purchased_starter_bundle'),
          DuelystFirebase.connect().getRootRef(),
        ]).then(function ([userRow, rootRef]) {
          if (userRow.has_purchased_starter_bundle) {
            return FirebasePromises.set(
              rootRef.child('user-purchase-counts').child(userId).child('STARTERBUNDLE_201604'),
              { count: 1 },
            );
          }
        }),
      )
      .then(() =>
        Logger.module('MigrationsModule').timeEnd(
          `userCreateChargeCountsMigration() -> ${userId} done`.green,
        ),
      );
    return txPromise;
  }

  /**
   * Checks if a user has a incomplete gauntlet run made before the Gauntlet changes
   * @private
   * @param  {Object}  userRow      the user's current db row (specifically needs last_session_version)
   * @return  {Promise}          Promise that will resolve to true or false (This doesn't require a promise but this is keeps convention)
   */
  static checkIfUserNeedsIncompleteGauntletRefund(userRow) {
    const versionFeatureIntroduced = '1.85.0';
    const userLastSessionVersion = userRow.last_session_version || '0.0.0';

    if (semver.gte(userLastSessionVersion, versionFeatureIntroduced)) {
      return Promise.resolve(false);
    } else {
      return knex('user_gauntlet_run')
        .first('is_complete', 'created_at', 'faction_choices')
        .where('user_id', userRow.id)
        .then(function (currentRunRow) {
          if (currentRunRow == null) {
            return Promise.resolve(false);
          }

          const currentRunStartedMoment = moment.utc(currentRunRow.created_at);
          const refundRunsStartBefore = moment.utc('2017-05-31 13:00');

          // Only refund incomplete runs
          if (currentRunRow.is_complete) {
            return Promise.resolve(false);
          }

          // Only refund runs started before new patch
          if (currentRunStartedMoment.valueOf() >= refundRunsStartBefore.valueOf()) {
            return Promise.resolve(false);
          }

          // Final check, only perform this if the row contains faction choices which are not present in new data
          if (currentRunRow.faction_choices != null) {
            return Promise.resolve(true);
          } else {
            return Promise.resolve(false);
          }
        });
    }
  }

  /**
   * ...
   * @private
   * @param  {String}  userId       userId to migration
   * @return  {Promise}          Promise that resolves on completion
   */
  static userIncompleteGauntletRefund(userId, systemTime) {
    if (!userId) {
      Logger.module('MigrationsModule').debug(
        `userIncompleteGauntletRefund() -> invalid user ID - ${userId}.`.red,
      );
      return Promise.reject(
        new Error(`Can not check for incomplete Gauntlet Run: invalid user ID - ${userId}`),
      );
    }

    const MOMENT_NOW_UTC = systemTime || moment().utc();
    Logger.module('MigrationsModule').time(
      `userIncompleteGauntletRefund() -> ${userId} done`.green,
    );

    var txPromise = knex
      .transaction((tx) =>
        tx('user_gauntlet_run')
          .where('user_id', userId)
          .delete()
          .then(() =>
            InventoryModule.addArenaTicketToUser(txPromise, tx, userId, 'migration refund'),
          )
          .then(() => DuelystFirebase.connect().getRootRef())
          .then((fbRootRef) =>
            FirebasePromises.remove(
              fbRootRef.child('user-gauntlet-run').child(userId).child('current'),
            ),
          ),
      )
      .then(() =>
        Logger.module('MigrationsModule').timeEnd(
          `userIncompleteGauntletRefund() -> ${userId} done`.green,
        ),
      );
    return txPromise;
  }

  /**
   * Checks if a user has unlockable orbs which have now been combined
   * @private
   * @param  {Object}  userRow      the user's current db row (specifically needs last_session_version)
   * @return  {Promise}          Promise that will resolve to true or false
   */
  static checkIfUserNeedsUnlockableOrbsRefund(userRow) {
    const versionFeatureIntroduced = '1.92.0';
    const userLastSessionVersion = userRow.last_session_version || '0.0.0';

    if (semver.gte(userLastSessionVersion, versionFeatureIntroduced)) {
      return Promise.resolve(false);
    } else {
      return knex('user_spirit_orbs')
        .first('user_id', 'card_set')
        .whereIn('card_set', [SDK.CardSet.Bloodborn, SDK.CardSet.Unity])
        .andWhere('user_id', userRow.id)
        .then(function (unlockableOrbRow) {
          if (unlockableOrbRow != null) {
            return Promise.resolve(true);
          } else {
            return Promise.resolve(false);
          }
        });
    }
  }

  /**
   * Refunds a user 300 gold for any unopened unlockable orbs that have been combined into the combined orb set
   * @private
   * @param  {String}  userId       userId to migration
   * @return  {Promise}          Promise that resolves on completion
   */
  static userUnlockableOrbsRefund(userId, systemTime) {
    const _chainState: Record<string, any> = {};
    let txPromise;
    const unlockableOrbGoldRefundAmount = 300;

    if (!userId) {
      Logger.module('MigrationsModule').debug(
        `userUnlockableOrbsRefund() -> invalid user ID - ${userId}.`.red,
      );
      return Promise.reject(
        new Error(`Can not check for incomplete Gauntlet Run: invalid user ID - ${userId}`),
      );
    }

    const MOMENT_NOW_UTC = systemTime || moment().utc();
    Logger.module('MigrationsModule').time(`userUnlockableOrbsRefund() -> ${userId} done`.green);

    return (txPromise = knex
      .transaction((tx) =>
        tx('user_spirit_orbs')
          .select('id', 'user_id', 'card_set')
          .whereIn('card_set', [SDK.CardSet.Bloodborn, SDK.CardSet.Unity])
          .andWhere('user_id', userId)
          .then(function (userUnlockableSpiritOrbRows) {
            _chainState.userUnlockableSpiritOrbRows = userUnlockableSpiritOrbRows;
            return PromiseUtils.map(_chainState.userUnlockableSpiritOrbRows, (unlockableOrbRow) =>
              Promise.all([
                tx('user_spirit_orbs').where('id', unlockableOrbRow.id).delete(),
                InventoryModule.giveUserGold(
                  txPromise,
                  tx,
                  userId,
                  unlockableOrbGoldRefundAmount,
                  'unlockable orb refund',
                  unlockableOrbRow.id,
                ),
              ]),
            );
          })
          .then(() => DuelystFirebase.connect().getRootRef())
          .then(function (fbRootRef) {
            return PromiseUtils.map(_chainState.userUnlockableSpiritOrbRows, (unlockableOrbRow) =>
              FirebasePromises.remove(
                fbRootRef
                  .child('user-inventory')
                  .child(userId)
                  .child('spirit-orbs')
                  .child(unlockableOrbRow.id),
              ),
            );
            return FirebasePromises.remove(
              fbRootRef.child('user-gauntlet-run').child(userId).child('current'),
            );
          }),
      )
      .then(() =>
        Logger.module('MigrationsModule').timeEnd(
          `userUnlockableOrbsRefund() -> ${userId} done`.green,
        ),
      ));
  }
}

// endregion PER USER MIGRATIONS

module.exports = MigrationsModule;
module.exports.EMOTE_IDS_PRE_COSMETICS_20160708 = EMOTE_IDS_PRE_COSMETICS_20160708;
