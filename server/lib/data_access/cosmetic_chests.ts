/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const util = require('util');
const FirebasePromises = require('../firebase_promises');
const DuelystFirebase = require('../duelyst_firebase_module');
const GamesModule = require('./games');
const Logger = require('../../../app/common/logger');
const colors = require('colors');
const moment = require('moment');
const _ = require('underscore');
const SyncModule = require('./sync');
const Errors = require('../custom_errors');
const knex = require('./knex');
const config = require('../../../config/config.js');
const generatePushId = require('../../../app/common/generate_push_id');

// redis
const { Redis, Jobs, GameManager } = require('../../redis');

// SDK imports
const SDK = require('../../../app/sdk');
const UtilsGameSession = require('../../../app/common/utils/utils_game_session');

const InventoryModule = require('./inventory');
const PromiseUtils = require('../../../app/common/utils/utils_promise');
const { onType } = require('../../../app/common/utils/utils_promise');

class CosmeticChestsModule {
  static CHEST_GAME_COUNT_WINDOW = 10;
  static BOSS_CHEST_EXPIRATION_HOURS = 48;
  static CHEST_EXPIRATION_BUFFER_MINUTES = 15;

  /**
   * Give a user 1 or more cosmetic chests.
   * @public
   * @param  {Promise}    trxPromise        Transaction promise that resolves if transaction succeeds.
   * @param  {Transaction}  trx            KNEX transaction to attach this operation to.
   * @param  {String}    userId          User ID to give the chest to.
   * @param  {String}    chestType        Type of chest to give the user
   * @param  {Integer}    chestAmount        Amount of chests to add to user.
   * @param  {String}    transactionType    'soft','hard'
   * @param  {String}    transactionId      the identifier that caused this chest to be added.
   * @param  {Integer}    bossId          card id for boss or null
   * @param  {String}    eventId          push id for event
   * @return  {Promise}                Promise that will resolve on completion.
   */
  static giveUserChest(trxPromise, trx, userId, chestType, bossId, eventId, chestAmount, transactionType, transactionId, systemTime) {
    const _chainState: Record<string, any> = {};
    // userId must be defined
    if (!userId) {
      Logger.module('CosmeticChestsModule').debug(`giveUserChest() -> invalid user ID - ${userId}.`.red);
      return Promise.reject(new Error(`Can not give chest to user: invalid user ID - ${userId}`));
    }

    // chestType must be defined and be a valid type
    if (!chestType || (_.contains(_.values(SDK.CosmeticsChestTypeLookup), chestType) == null)) {
      Logger.module('CosmeticChestsModule').debug(`giveUserChest() -> invalid chest type - ${chestType}.`.red);
      return Promise.reject(new Error(`Can not give chest to user: invalid chest type - ${chestType}`));
    }

    // Boss Id is required for boss chests
    if ((chestType === SDK.CosmeticsChestTypeLookup.Boss) && (bossId == null)) {
      Logger.module('CosmeticChestsModule').debug(`giveUserChest() -> invalid bossId for boss chest - ${bossId}.`.red);
      return Promise.reject(new Error(`Can not give chest to user: invalid bossId for boss chest - ${bossId}`));
    }

    // Boss crates require an event id
    if ((chestType === SDK.CosmeticsChestTypeLookup.Boss) && (eventId == null)) {
      Logger.module('CosmeticChestsModule').debug(`giveUserChest() -> invalid bossId for boss chest - ${bossId}.`.red);
      return Promise.reject(new Error(`Can not give chest to user: invalid bossId for boss chest - ${bossId}`));
    }

    // Non boss crates should not have a boss id
    if ((chestType !== SDK.CosmeticsChestTypeLookup.Boss) && (bossId != null)) {
      Logger.module('CosmeticChestsModule').debug(`giveUserChest() -> bossId should not exist for non boss chest - ${bossId}.`.red);
      return Promise.reject(new Error(`Can not give chest to user: bossId should not exist for non boss chest - ${bossId}`));
    }

    // chestAmount must be defined and greater than 0
    chestAmount = parseInt(chestAmount);
    if (!chestAmount || !(chestAmount > 0)) {
      Logger.module('CosmeticChestsModule').debug(`giveUserChest() -> invalid chest amount - ${chestAmount}.`.red);
      return Promise.reject(new Error(`Can not give chest to user: invalid chest amount - ${chestAmount}`));
    }

    // Can only give 1 boss crate at a time
    if ((chestType === SDK.CosmeticsChestTypeLookup.Boss) && (chestAmount !== 1)) {
      Logger.module('CosmeticChestsModule').debug(`giveUserChest() -> invalid boss chest amount - ${chestAmount}.`.red);
      return Promise.reject(new Error(`Can not give chest to user: invalid boss chest amount - ${chestAmount}`));
    }

    const NOW_UTC_MOMENT = systemTime || moment.utc();

    const getMaxChestCountForType = function (chestType) {
      if (chestType === SDK.CosmeticsChestTypeLookup.Boss) {
        return null;
      } else {
        return 5;
      }
    };

    const maxChestCount = getMaxChestCountForType(chestType);

    let expirationMoment = null;
    if (chestType === SDK.CosmeticsChestTypeLookup.Boss) {
      expirationMoment = NOW_UTC_MOMENT.clone();
      expirationMoment.add(CosmeticChestsModule.BOSS_CHEST_EXPIRATION_HOURS, 'hours');
    }

    _chainState.chestDatas = [];

    return trx('user_cosmetic_chests').where('user_id', userId).andWhere('chest_type', chestType).count('chest_type as count')
      .then(function (response) {
        const chestCount = response[0].count;
        if (maxChestCount != null) {
          const slotsLeft = Math.max(0, maxChestCount - chestCount);
          Logger.module('CosmeticChestsModule').debug(`giveUserChest() -> User ${userId.blue}`.green + ` currently has ${slotsLeft} slots left for chests of type ${chestType}.`);
          chestAmount = Math.min(chestAmount, slotsLeft);
        }

        Logger.module('CosmeticChestsModule').time(`giveUserChest() -> User ${userId.blue}`.green + ` received ${chestAmount} chests of type ${chestType}.`.green);
        return PromiseUtils.map(__range__(0, chestAmount, false), function () {
          const chestData: Record<string, any> = {
            user_id: userId,
            chest_id: generatePushId(),
            chest_type: chestType,
            transaction_type: transactionType,
            transaction_id: transactionId,
            boss_id: bossId,
            boss_event_id: eventId,
            created_at: NOW_UTC_MOMENT.toDate(),
          };
          if (expirationMoment != null) {
            chestData.expires_at = expirationMoment.toDate();
          }
          _chainState.chestDatas.push(chestData);
          return trx('user_cosmetic_chests').insert(chestData);
        });
      })
      .then(function () {
        Logger.module('CosmeticChestsModule').timeEnd(`giveUserChest() -> User ${userId.blue}`.green + ` received ${chestAmount} chests of type ${chestType}.`.green);

        // Attach to txPromise adding fb writes
        trxPromise
          .then(() => DuelystFirebase.connect().getRootRef()).then(function (rootRef) {
            _chainState.rootRef = rootRef;
            const allFbPromises = [];
            for (var chestData of Array.from<any>(_chainState.chestDatas)) {
              var fbChestData = _.extend({}, chestData);
              fbChestData.created_at = NOW_UTC_MOMENT.valueOf();
              if (expirationMoment != null) {
                fbChestData.expires_at = expirationMoment.valueOf();
              }

              allFbPromises.push(FirebasePromises.set(_chainState.rootRef.child('user-inventory').child(userId).child('cosmetic-chests').child(chestData.chest_id), fbChestData));
            }
            return Promise.all(allFbPromises);
          });

        // Resolve to the chest data being received
        return Promise.resolve(_chainState.chestDatas);
      });
  }

  static giveUserChestKey(trxPromise, trx, userId, keyType, keyAmount, transactionType, transactionId, systemTime) {
    if (keyType === SDK.CosmeticsChestTypeLookup.Boss) {
      keyType = SDK.CosmeticsChestTypeLookup.Rare;
    }
    return this.giveUserChest(trxPromise, trx, userId, keyType, null, null, keyAmount, transactionType, transactionId, systemTime);
  }

  /**
   * Give a user 1 or more cosmetic chest keys.
   * @public
   * @param  {Promise}    trxPromise        Transaction promise that resolves if transaction succeeds.
   * @param  {Transaction}  trx            KNEX transaction to attach this operation to.
   * @param  {String}    userId          User ID to give the chest keys to.
   * @param  {String}    keyType        Type of chest keys to give the user
   * @param  {Integer}    keyAmount        Amount of chest keys to add to user.
   * @param  {String}    transactionType    'soft','hard'
   * @param  {String}    transactionId      the identifier that caused this chest to be added.
   * @return  {Promise}                Promise that will resolve on completion.
   */
  /*
  @giveUserChestKey: (trxPromise,trx,userId,keyType,keyAmount,transactionType,transactionId,systemTime)->

    * userId must be defined
    unless userId
      Logger.module("CosmeticChestsModule").debug "giveUserChestKey() -> invalid user ID - #{userId}.".red
      return Promise.reject(new Error("Can not give chest key to user: invalid user ID - #{userId}"))

    * keyType must be defined and be a valid type
    unless keyType and _.contains(_.values(SDK.CosmeticsChestTypeLookup),keyType)
      Logger.module("CosmeticChestsModule").debug "giveUserChestKey() -> invalid chest key type - #{keyType}.".red
      return Promise.reject(new Error("Can not give chest key to user: invalid chest key type - #{keyType}"))

    * keyAmount must be defined and greater than 0
    keyAmount = parseInt(keyAmount)
    unless keyAmount and keyAmount > 0
      Logger.module("CosmeticChestsModule").debug "giveUserChestKey() -> invalid chest key amount - #{keyAmount}.".red
      return Promise.reject(new Error("Can not give chest key to user: invalid chest key amount - #{keyAmount}"))

    NOW_UTC_MOMENT = systemTime || moment.utc()

    Logger.module("CosmeticChestsModule").time "giveUserChestKey() -> User #{userId.blue}".green + " received #{keyAmount} chest keys of type #{keyType}.".green

    this_obj = {}

    this_obj.chestKeyDatas = []

    return Promise.map([1..keyAmount], () ->
      keyData =
        user_id:           userId
        key_id:           generatePushId()
        key_type:         keyType
        transaction_type: transactionType
        transaction_id:   transactionId
        created_at:       NOW_UTC_MOMENT.toDate()

      this_obj.chestKeyDatas.push(keyData)

      return trx("user_cosmetic_chest_keys").insert(keyData)
    )
    .bind this_obj
    .then ()->
      Logger.module("CosmeticChestsModule").timeEnd "giveUserChestKey() -> User #{userId.blue}".green + " received #{keyAmount} chest keys of type #{keyType}.".green

      * Attach to txPromise adding fb writes
      trxPromise
      .bind this_obj
      .then () ->
        return DuelystFirebase.connect().getRootRef()
      .then (rootRef)->
        allFbPromises = []
        for chestKeyData in @.chestKeyDatas
          fbChestKeyData = _.extend({},chestKeyData)
          fbChestKeyData.created_at = NOW_UTC_MOMENT.valueOf()

          allFbPromises.push(FirebasePromises.set(rootRef.child('user-inventory').child(userId).child("cosmetic-chest-keys").child(fbChestKeyData.key_id),fbChestKeyData))
        return Promise.all(allFbPromises)

      return Promise.resolve(@.chestKeyDatas)
  */

  /**
   * Opens a cosmetic chest for a user given a key and chest id
   * Uses an explicit chest and key id to respect that chests and keys are unique items in database (which could be potentially handled by more than type, e.g. Legacy Silver Chest!)
   * @public
   * @param  {String}  userId        User ID for which to open the chest.
   * @param  {String}  chestId        Chest ID to open.
   * @param  {String}  keyId        Key ID to open.
   * @return  {Promise}            Promise that will post UNLOCKED BOOSTER PACK DATA on completion.
   */
  static openChest(userId, chestId, systemTime) {
    const _chainState: Record<string, any> = {};
    // userId must be defined
    if (!userId) {
      Logger.module('CosmeticChestsModule').debug(`openChest() -> invalid user ID - ${userId}.`.red);
      return Promise.reject(new Error(`Can not open chest: invalid user ID - ${userId}`));
    }

    // chestId must be defined
    if (!chestId) {
      Logger.module('CosmeticChestsModule').debug(`openChest() -> invalid chest ID - ${chestId}.`.red);
      return Promise.reject(new Error(`Can not open chest: invalid chest ID - ${chestId}`));
    }

    // keyId must be defined
    // unless keyId
    //  Logger.module("CosmeticChestsModule").debug "openChest() -> invalid key ID - #{keyId}.".red
    //  return Promise.reject(new Error("Can not open chest: invalid key ID - #{keyId}"))

    const NOW_UTC_MOMENT = systemTime || moment.utc();

    const this_obj: Record<string, any> = {};

    Logger.module('CosmeticChestsModule').time(`openChest() -> User ${userId.blue}`.green + ` opened chest ID ${chestId}.`.green);

    var txPromise = knex.transaction(function (tx) {
      tx('users').where('id', userId).first('id').forUpdate()
        .then(() => Promise.all([
          tx.first().from('user_cosmetic_chests').where('chest_id', chestId).forUpdate(),
          tx.select('cosmetic_id').from('user_cosmetic_inventory').where('user_id', userId).forUpdate(),
        ]))
        .then(function ([chestRow, userCosmeticRows]) {
          if ((chestRow == null) || (chestRow.user_id !== userId)) {
            return Promise.reject(new Errors.NotFoundError('The chest ID you provided does not exist or belong to you.'));
          }

          // Check if chest is expired, if grab instead the chest of that type for the user that expires last
          if (chestRow.expires_at != null) {
            const chestExpirationMoment = moment.utc(chestRow.expires_at);
            const bufferedChestExpirationMoment = chestExpirationMoment.clone().add(CosmeticChestsModule.CHEST_EXPIRATION_BUFFER_MINUTES, 'minutes');
            if (bufferedChestExpirationMoment.isBefore(NOW_UTC_MOMENT)) {
              return Promise.reject(new Errors.InvalidRequestError('The chest id provided has expired.'));
            }
          }

          _chainState.chestRow = chestRow;
          // @.keyRow = keyRow

          // if not keyRow? or keyRow.user_id != userId
          //  return Promise.reject(new Errors.NotFoundError("The chest key ID you provided does not exist or belong to you."))

          // if keyRow.key_type != chestRow.chest_type
          //  return Promise.reject(new Errors.ChestAndKeyTypeDoNotMatchError("The chest and key you provided do not match in type."))

          // Gather rewards
          _chainState.rewardDatas = CosmeticChestsModule._generateChestOpeningRewards(_chainState.chestRow);

          _chainState.ownedCosmeticIds = [];
          if (userCosmeticRows != null) {
            _chainState.ownedCosmeticIds = _.map(userCosmeticRows, (cosmeticRow) => cosmeticRow.cosmetic_id);
          }

          _chainState.resValue = [];

          // Create promises to give rewards
          return PromiseUtils.each(_chainState.rewardDatas, (rewardData) => {
            let prismaticCardIds,
              rewardedCardId;
            if (rewardData.cosmetic_common != null) {
              return InventoryModule.giveUserNewPurchasableCosmetic(txPromise, tx, userId, 'cosmetic chest', _chainState.chestRow.chest_id, SDK.Rarity.Common, null, _chainState.ownedCosmeticIds, NOW_UTC_MOMENT)
                .then((cosmeticReward) => {
                  if ((cosmeticReward != null) && (cosmeticReward.cosmetic_id != null)) {
                    _chainState.ownedCosmeticIds.push(cosmeticReward.cosmetic_id);
                  }
                  return _chainState.resValue.push(cosmeticReward);
                });
            } else if (rewardData.cosmetic_rare != null) {
              return InventoryModule.giveUserNewPurchasableCosmetic(txPromise, tx, userId, 'cosmetic chest', _chainState.chestRow.chest_id, SDK.Rarity.Rare, null, _chainState.ownedCosmeticIds, NOW_UTC_MOMENT)
                .then((cosmeticReward) => {
                  if ((cosmeticReward != null) && (cosmeticReward.cosmetic_id != null)) {
                    _chainState.ownedCosmeticIds.push(cosmeticReward.cosmetic_id);
                  }
                  return _chainState.resValue.push(cosmeticReward);
                });
            } else if (rewardData.cosmetic_epic != null) {
              return InventoryModule.giveUserNewPurchasableCosmetic(txPromise, tx, userId, 'cosmetic chest', _chainState.chestRow.chest_id, SDK.Rarity.Epic, null, _chainState.ownedCosmeticIds, NOW_UTC_MOMENT)
                .then((cosmeticReward) => {
                  if ((cosmeticReward != null) && (cosmeticReward.cosmetic_id != null)) {
                    _chainState.ownedCosmeticIds.push(cosmeticReward.cosmetic_id);
                  }
                  return _chainState.resValue.push(cosmeticReward);
                });
            } else if (rewardData.cosmetic_legendary != null) {
              return InventoryModule.giveUserNewPurchasableCosmetic(txPromise, tx, userId, 'cosmetic chest', _chainState.chestRow.chest_id, SDK.Rarity.Legendary, null, _chainState.ownedCosmeticIds, NOW_UTC_MOMENT)
                .then((cosmeticReward) => {
                  if ((cosmeticReward != null) && (cosmeticReward.cosmetic_id != null)) {
                    _chainState.ownedCosmeticIds.push(cosmeticReward.cosmetic_id);
                  }
                  return _chainState.resValue.push(cosmeticReward);
                });
            } else if (rewardData.spirit_orb != null) {
              return InventoryModule.addBoosterPackToUser(txPromise, tx, userId, rewardData.spirit_orb, 'cosmetic chest', _chainState.chestRow.chest_id)
                .then((spiritOrbRewardedId) => _chainState.resValue.push({ spirit_orbs: rewardData.spirit_orb }));
            } else if (rewardData.prismatic_common != null) {
              prismaticCardIds = SDK.GameSession.getCardCaches().getRarity(SDK.Rarity.Common).getIsUnlockable(false).getIsCollectible(true)
                .getIsPrismatic(true)
                .getCardIds();
              rewardedCardId = _.sample(prismaticCardIds);
              return InventoryModule.giveUserCards(txPromise, tx, userId, [rewardedCardId], 'cosmetic chest', _chainState.chestRow.chest_id)
                .then(() => _chainState.resValue.push({ card_id: rewardedCardId }));
            } else if (rewardData.prismatic_rare != null) {
              prismaticCardIds = SDK.GameSession.getCardCaches().getRarity(SDK.Rarity.Rare).getIsUnlockable(false).getIsCollectible(true)
                .getIsPrismatic(true)
                .getCardIds();
              rewardedCardId = _.sample(prismaticCardIds);
              return InventoryModule.giveUserCards(txPromise, tx, userId, [rewardedCardId], 'cosmetic chest', _chainState.chestRow.chest_id)
                .then(() => _chainState.resValue.push({ card_id: rewardedCardId }));
            } else if (rewardData.prismatic_epic != null) {
              prismaticCardIds = SDK.GameSession.getCardCaches().getRarity(SDK.Rarity.Epic).getIsUnlockable(false).getIsCollectible(true)
                .getIsPrismatic(true)
                .getCardIds();
              rewardedCardId = _.sample(prismaticCardIds);
              return InventoryModule.giveUserCards(txPromise, tx, userId, [rewardedCardId], 'cosmetic chest', _chainState.chestRow.chest_id)
                .then(() => _chainState.resValue.push({ card_id: rewardedCardId }));
            } else if (rewardData.prismatic_legendary != null) {
              prismaticCardIds = SDK.GameSession.getCardCaches().getRarity(SDK.Rarity.Legendary).getIsUnlockable(false).getIsCollectible(true)
                .getIsPrismatic(true)
                .getCardIds();
              rewardedCardId = _.sample(prismaticCardIds);
              return InventoryModule.giveUserCards(txPromise, tx, userId, [rewardedCardId], 'cosmetic chest', _chainState.chestRow.chest_id)
                .then(() => _chainState.resValue.push({ card_id: rewardedCardId }));
            } else if (rewardData.chest_key != null) {
              return CosmeticChestsModule.giveUserChestKey(txPromise, tx, userId, rewardData.chest_key, 1, 'cosmetic chest', _chainState.chestRow.chest_id, NOW_UTC_MOMENT)
                .then(() => _chainState.resValue.push({ chest_key: rewardData.chest_key }));
            } else if (rewardData.gold != null) {
              return InventoryModule.giveUserGold(txPromise, tx, userId, rewardData.gold, 'cosmetic chest', _chainState.chestRow.chest_id)
                .then(() => _chainState.resValue.push({ gold: rewardData.gold }));
            } else if (rewardData.spirit != null) {
              return InventoryModule.giveUserSpirit(txPromise, tx, userId, rewardData.spirit, 'cosmetic chest', _chainState.chestRow.chest_id)
                .then(() => _chainState.resValue.push({ spirit: rewardData.spirit }));
            } else if (rewardData.common_card != null) {
              const commonCardIds = SDK.GameSession.getCardCaches().getRarity(SDK.Rarity.Common).getIsUnlockable(false).getIsCollectible(true)
                .getIsPrismatic(false)
                .getCardIds();
              rewardedCardId = _.sample(commonCardIds);
              return InventoryModule.giveUserCards(txPromise, tx, userId, [rewardedCardId], 'cosmetic chest', _chainState.chestRow.chest_id)
                .then(() => _chainState.resValue.push({ card_id: rewardedCardId }));
            } else if (rewardData.rare_card != null) {
              const rareCardIds = SDK.GameSession.getCardCaches().getRarity(SDK.Rarity.Rare).getIsUnlockable(false).getIsCollectible(true)
                .getIsPrismatic(false)
                .getCardIds();
              rewardedCardId = _.sample(rareCardIds);
              return InventoryModule.giveUserCards(txPromise, tx, userId, [rewardedCardId], 'cosmetic chest', _chainState.chestRow.chest_id)
                .then(() => _chainState.resValue.push({ card_id: rewardedCardId }));
            } else if (rewardData.epic_card != null) {
              const epicCardIds = SDK.GameSession.getCardCaches().getRarity(SDK.Rarity.Epic).getIsUnlockable(false).getIsCollectible(true)
                .getIsPrismatic(false)
                .getCardIds();
              rewardedCardId = _.sample(epicCardIds);
              return InventoryModule.giveUserCards(txPromise, tx, userId, [rewardedCardId], 'cosmetic chest', _chainState.chestRow.chest_id)
                .then(() => _chainState.resValue.push({ card_id: rewardedCardId }));
            } else if (rewardData.legendary_card != null) {
              const legendaryCardIds = SDK.GameSession.getCardCaches().getRarity(SDK.Rarity.Legendary).getIsUnlockable(false).getIsCollectible(true)
                .getIsPrismatic(false)
                .getCardIds();
              rewardedCardId = _.sample(legendaryCardIds);
              return InventoryModule.giveUserCards(txPromise, tx, userId, [rewardedCardId], 'cosmetic chest', _chainState.chestRow.chest_id)
                .then(() => _chainState.resValue.push({ card_id: rewardedCardId }));
            } else if (rewardData.card_ids != null) {
              return InventoryModule.giveUserCards(txPromise, tx, userId, rewardData.card_ids, 'cosmetic chest', _chainState.chestRow.chest_id)
                .then(() => Array.from<any>(rewardData.card_ids).map((card_id) =>
                  _chainState.resValue.push({ card_id })));
            } else if (rewardData.gauntlet_tickets != null) {
              return InventoryModule.addArenaTicketToUser(txPromise, tx, userId, 'cosmetic chest', _chainState.chestRow.chest_id)
                .then(() => _chainState.resValue.push({ gauntlet_tickets: rewardData.gauntlet_tickets }));
            } else {
              Logger.module('CosmeticChestsModule').debug(`openChest() -> Error opening chest id ${_chainState.chestRow.chest_id}.`.red);
              return Promise.reject(new Error(`Error opening chest: Unknown reward type in data - ${JSON.stringify(rewardData)}`));
            }
          }, { concurrency: 1 });
        })
        .then(function () {
        // NOTE: The following is the cosmetic ids generated, some may be dupes and reward spirit instead
          _chainState.rewardedCosmeticIds = _.map(_.filter(_chainState.resValue, (rewardData) => rewardData.cosmetic_id != null), (rewardData) => rewardData.cosmetic_id);

          _chainState.openedChestRow = _.extend({}, _chainState.chestRow);
          _chainState.openedChestRow.opened_with_key_id = '-1';
          _chainState.openedChestRow.rewarded_cosmetic_ids = _chainState.rewardedCosmeticIds;
          _chainState.openedChestRow.opened_at = NOW_UTC_MOMENT.toDate();

          // @.usedKeyRow = _.extend({},@.keyRow)
          // @.usedKeyRow.used_with_chest_id = @.chestRow.chest_id
          // @.usedKeyRow.used_at = NOW_UTC_MOMENT.toDate()

          // Move key and chest into used tables
          return Promise.all([
            tx('user_cosmetic_chests').where('chest_id', _chainState.chestRow.chest_id).delete(),
            tx('user_cosmetic_chests_opened').insert(_chainState.openedChestRow),
          ]);
        })
        .then(() => SyncModule._bumpUserTransactionCounter(tx, userId))
        .then(tx.commit)
        .catch(tx.rollback);
    });
    return txPromise
      .then(function () {
      // Attach to txPromise adding fb writes
        txPromise
          .then(() => DuelystFirebase.connect().getRootRef()).then(function (rootRef) {
            return Promise.all([
              FirebasePromises.remove(rootRef.child('user-inventory').child(userId).child('cosmetic-chests').child(_chainState.chestRow.chest_id)),
            ]);
          });

        Logger.module('CosmeticChestsModule').timeEnd(`openChest() -> User ${userId.blue}`.green + ` opened chest ID ${chestId}.`.green);

        return Promise.resolve(_chainState.resValue);
      });
  }

  /**
   * Module method to create reward data for cosmetic chest opens
   * - Reference doc: https://docs.google.com/spreadsheets/d/1sf82iRe7_4TV89wTUB9KZKYdm_sqj-SG3TwvCEyKUcs/
   * @public
   * @param  {Object}    chestRow - the sql db data for the chest being opened
   * @return  {[Object]}  Returns an array of reward datas each with one of the following formats:
   * card_id: {integer} a single card id rewarded (most likely prismatic)
   * cosmetic_id: {integer} a single cosmetic id rewarded
   * spirit_orb: {integer} (always 1) a single spirit orb
   * chest_key: {integer} a CosmeticsChestType
   * Potential
   */
  static _generateChestOpeningRewards(chestRow) {
    let drop3Seed,
      drop4Seed,
      drop5Seed;
    const chestType = chestRow.chest_type;
    const rewards = [];

    if (chestType === SDK.CosmeticsChestTypeLookup.Common) {
      /*
      * Drop 1 - prismatic card
      drop1Seed = Math.random()
      if drop1Seed < 0.75
        * Prismatic common
        rewards.push({prismatic_common:1})
      else if drop1Seed < 0.95
        * Prismatic rare
        rewards.push({prismatic_rare:1})
      else if drop1Seed < 0.99
        * Prismatic epic
        rewards.push({prismatic_epic:1})
      else
        * Prismatic legendary
        rewards.push({prismatic_legendary:1})
      */
      // Drop 2 - Always a cosmetic common
      rewards.push({ cosmetic_common: 1 });
      // Drop 3 - Cosmetic
      drop3Seed = Math.random();
      if (drop3Seed < 0.85) {
        // Cosmetic Rare
        rewards.push({ cosmetic_rare: 1 });
      } else if (drop3Seed < 0.98) {
        // Cosmetic epic
        rewards.push({ cosmetic_epic: 1 });
      } else {
        // Cosmetic legendary
        rewards.push({ cosmetic_legendary: 1 });
      }
    }

    if (chestType === SDK.CosmeticsChestTypeLookup.Rare) {
      /*
      * Drop 1 - Prismatic
      drop1Seed = Math.random()
      if drop1Seed < 0.85
        * Prismatic rare
        rewards.push({prismatic_rare:1})
      else if drop1Seed < 0.95
        * Prismatic epic
        rewards.push({prismatic_epic:1})
      else
        * Prismatic legendary
        rewards.push({prismatic_legendary:1})
      */
      // Drop 2 - Always a cosmetic common
      rewards.push({ cosmetic_common: 1 });
      // Drop 3
      drop3Seed = Math.random();
      if (drop3Seed < 0.60) {
        // Cosmetic common
        rewards.push({ cosmetic_common: 1 });
      } else if (drop3Seed < 0.90) {
        // Cosmetic rare
        rewards.push({ cosmetic_rare: 1 });
      } else {
        // Cosmetic Epic
        rewards.push({ cosmetic_epic: 1 });
      }
      // Drop 4
      drop4Seed = Math.random();
      if (drop4Seed < 0.85) {
        // Cosmetic rare
        rewards.push({ cosmetic_rare: 1 });
      } else {
        // Cosmetic epic
        rewards.push({ cosmetic_epic: 1 });
      }
      // Drop 5
      drop5Seed = Math.random();
      if (drop5Seed < 0.90) {
        // Cosmetic epic
        rewards.push({ cosmetic_epic: 1 });
      } else {
        // Cosmetic legendary
        rewards.push({ cosmetic_legendary: 1 });
      }
    }

    if (chestType === SDK.CosmeticsChestTypeLookup.Epic) {
      /*
      * Drop 1 -
      drop1Seed = Math.random()
      if drop1Seed < 0.85
        * Prismatic rare
        rewards.push({prismatic_rare:1})
      else if drop1Seed < 0.95
        * Prismatic epic
        rewards.push({prismatic_epic:1})
      else
        * Prismatic legendary
        rewards.push({prismatic_legendary:1})
      * Drop 2
      drop2Seed = Math.random()
      if drop2Seed < 0.45
        * Prismatic rare
        rewards.push({prismatic_rare:1})
      else if drop2Seed < 0.90
        * Prismatic epic
        rewards.push({prismatic_epic:1})
      else
        * Prismatic legendary
        rewards.push({prismatic_legendary:1})
      */
      // Drop 3 - Always a cosmetic common
      rewards.push({ cosmetic_common: 1 });
      // Drop 4
      drop4Seed = Math.random();
      if (drop4Seed < 0.60) {
        // Cosmetic Common
        rewards.push({ cosmetic_common: 1 });
      } else if (drop4Seed < 0.90) {
        // Cosmetic Rare
        rewards.push({ cosmetic_rare: 1 });
      } else {
        // Cosmetic Rare
        rewards.push({ cosmetic_epic: 1 });
      }
      // Drop 5
      drop5Seed = Math.random();
      if (drop5Seed < 0.85) {
        // Cosmetic rare
        rewards.push({ cosmetic_rare: 1 });
      } else {
        // Cosmetic epic
        rewards.push({ cosmetic_epic: 1 });
      }
      // Drop 6
      const drop6Seed = Math.random();
      if (drop6Seed < 0.90) {
        // Cosmetic epic
        rewards.push({ cosmetic_epic: 1 });
      } else {
        // Cosmetic legendary
        rewards.push({ cosmetic_legendary: 1 });
      }
      // Drop 7 - guaranteed cosmetic legendary
      rewards.push({ cosmetic_legendary: 1 });
    }

    if (chestType === SDK.CosmeticsChestTypeLookup.Boss) {
      if (chestRow.boss_id === 'example') {
        // rewards.push({cosmetic_epic:1})
      } else {
        // Default
        // 1 common cosmetic, 1 random orb from any set, 100 spirit
        rewards.push({ cosmetic_common: 1 });
        rewards.push({ spirit: 100 });
        const possibleOrbs = [SDK.CardSet.Core, SDK.CardSet.Shimzar, SDK.CardSet.FirstWatch, SDK.CardSet.Wartech, SDK.CardSet.CombinedUnlockables, SDK.CardSet.Coreshatter];
        rewards.push({ spirit_orb: possibleOrbs[Math.floor(Math.random() * possibleOrbs.length)] });
      }
    }

    return rewards;
  }

  /**
   * Update a user with cosmetic chest rewards by game outcome
   * MUST BE CALLED AFTER PROGRESSION IS UPDATED WITH GAME (WILL THROW ERROR IF NOT)
   * @public
   * @param  {String}  userId      User ID for which to update.
   * @param  {Boolean}  isWinner    Did the user win the game?
   * @param  {String}  gameId      Game unique ID
   * @param  {String}  gameType    Game type (see SDK.GameType)
   * @param  {Boolean}  isUnscored    Should this game be scored or unscored (if a user conceded too early for example?)
   * @param  {Boolean}  isDraw      Are we updating for a draw?
   * @param  {Moment}  systemTime    Pass in the current system time to use. Used only for testing.
   * @return  {Promise}          Promise that will notify when complete.
   */
  static updateUserChestRewardWithGameOutcome(userId, isWinner, gameId, gameType, isUnscored, isDraw, systemTime, probabilityOverride) {
    const _chainState: Record<string, any> = {};
    // userId must be defined
    if (!userId) {
      return Promise.reject(new Error(`Can not updateUserChestRewardWithGameOutcome(): invalid user ID - ${userId}`));
    }

    // gameId must be defined
    if (!gameId) {
      return Promise.reject(new Error(`Can not updateUserChestRewardWithGameOutcome(): invalid game ID - ${gameId}`));
    }

    // must be a competitive game
    if (!SDK.GameType.isCompetitiveGameType(gameType)) {
      return Promise.resolve(false);
    }

    const MOMENT_NOW_UTC = systemTime || moment().utc();
    const this_obj: Record<string, any> = {};

    var txPromise = knex.transaction((tx) => PromiseUtils.withTimeout(Promise.resolve(tx('users').where('id', userId).first('id').forUpdate())
      .then(() => tx('user_progression').where('user_id', userId).first().forUpdate()).then(function (userProgressionRow) {
        _chainState.userProgressionRow = userProgressionRow;
        if (userProgressionRow.last_game_id !== gameId) {
          return Promise.reject(new Error(`Can not updateUserChestRewardWithGameOutcome(): game ID - ${gameId} does not match user ID's ${userId} last game ID in progression ${userProgressionRow.last_game_id}`));
        }

        if (isWinner) {
          let chestType = CosmeticChestsModule._chestTypeForProgressionData(userProgressionRow, MOMENT_NOW_UTC, probabilityOverride);

          if ((chestType != null) && ((userProgressionRow.last_crate_awarded_at == null))) {
          // For a user's first chest, always give a bronze chest
            chestType = SDK.CosmeticsChestTypeLookup.Common;
            Logger.module('CosmeticChestsModule').debug(`updateUserChestRewardWithGameOutcome() -> user ${userId} receiving first chest for game ${gameId}`);
          }

          if (chestType != null) {
            Logger.module('CosmeticChestsModule').debug(`updateUserChestRewardWithGameOutcome() -> user ${userId} received ${chestType} chest for game ${gameId} with ${userProgressionRow.win_count} wins`);
            return CosmeticChestsModule.giveUserChest(txPromise, tx, userId, chestType, null, null, 1, 'win count', gameId, MOMENT_NOW_UTC);
          }
        }

        return Promise.resolve([]);
      })
      .then(function (awardedChestData) {
        _chainState.awardedChestData = awardedChestData;

        const allPromises = [];
        if (_chainState.awardedChestData.length > 0) {
        // reward row
          let rewardData;
          _chainState.rewardData = (rewardData = {
            id: generatePushId(),
            user_id: userId,
            reward_category: 'loot crate',
            reward_type: _chainState.awardedChestData[0].chest_type,
            cosmetic_chests: [_chainState.awardedChestData[0].chest_type],
            game_id: gameId,
            created_at: MOMENT_NOW_UTC.toDate(),
            is_unread: true,
          });
          allPromises.push(tx('user_rewards').insert(rewardData));
          allPromises.push(GamesModule._addRewardIdToUserGame(tx, userId, gameId, rewardData.id));
          allPromises.push(tx('user_progression').where('user_id', userId).update({
            last_crate_awarded_at: MOMENT_NOW_UTC.toDate(),
            last_crate_awarded_win_count: _chainState.userProgressionRow.win_count,
            last_crate_awarded_game_count: _chainState.userProgressionRow.game_count,
          }),
          );
        }
        return Promise.all(allPromises);
      }), 10000)
      .catch(onType(PromiseUtils.TimeoutError, function (e) {
        Logger.module('CosmeticChestsModule').error(`updateUserChestRewardWithGameOutcome() -> ERROR, operation timeout for u:${userId} g:${gameId}`);
        throw e;
      })))
      .then(function () {
        for (var chestData of Array.from<any>(_chainState.awardedChestData)) {
        // Currently there is only an achievement for first bronze chest so don't bother with others
          // no progression row at all means no crate has ever been awarded, which is
          // the same case this guard is looking for
          if ((chestData.chest_type === SDK.CosmeticsChestTypeLookup.Common)
            && (_chainState.userProgressionRow == null || _chainState.userProgressionRow.last_crate_awarded_at == null)) {
            Jobs.enqueue('update-user-achievements', {
              name: 'Update User Cosmetic Chest Achievements',
              title: util.format('User %s :: Update Cosmetic Chest Achievements', userId),
              userId,
              receivedCosmeticChestType: chestData.chest_type,
            }, { removeOnComplete: true });
          }
        }

        return _chainState.rewardData;
      }).finally(() => GamesModule.markClientGameJobStatusAsComplete(userId, gameId, 'cosmetic_chests'));

    return txPromise;
  }

  /**
   * Update a user with cosmetic chest rewards by boss game outcome
   * @public
   * @param  {String}  userId      User ID for which to update.
   * @param  {Boolean}  isWinner    Did the user win the game?
   * @param  {String}  gameId      Game unique ID
   * @param  {String}  gameType    Game type (see SDK.GameType)
   * @param  {Boolean}  isUnscored    Should this game be scored or unscored (if a user conceded too early for example?)
   * @param  {Boolean}  isDraw      Are we updating for a draw?
   * @param  {Moment}  systemTime    Pass in the current system time to use. Used only for testing.
   * @return  {Promise}          Promise that will notify when complete.
   */
  static updateUserChestRewardWithBossGameOutcome(userId, isWinner, gameId, gameType, isUnscored, isDraw, gameSessionData, systemTime, probabilityOverride) {
    const _chainState: Record<string, any> = {};
    // userId must be defined
    if (!userId) {
      return Promise.reject(new Error(`Can not updateUserChestRewardWithBossGameOutcome(): invalid user ID - ${userId}`));
    }

    // gameId must be defined
    if (!gameId) {
      return Promise.reject(new Error(`Can not updateUserChestRewardWithBossGameOutcome(): invalid game ID - ${gameId}`));
    }

    // must be a boss battle game
    if (gameType !== SDK.GameType.BossBattle) {
      return Promise.resolve(false);
    }

    if (!isWinner) {
      return Promise.resolve(false);
    }

    // Oppenent general must be part of the boss faction
    const opponentPlayerId = UtilsGameSession.getOpponentIdToPlayerId(gameSessionData, userId);
    const opponentPlayerSetupData = UtilsGameSession.getPlayerSetupDataForPlayerId(gameSessionData, opponentPlayerId);
    const bossId = opponentPlayerSetupData != null ? opponentPlayerSetupData.generalId : undefined;
    const sdkBossData = SDK.GameSession.getCardCaches().getCardById(bossId);

    if (((bossId == null)) || ((sdkBossData == null)) || (sdkBossData.getFactionId() !== SDK.Factions.Boss)) {
      return Promise.reject(new Error(`Can not updateUserChestRewardWithBossGameOutcome(): invalid boss ID - ${gameId}`));
    }

    const MOMENT_NOW_UTC = systemTime || moment().utc();
    const this_obj: Record<string, any> = {};

    var txPromise = knex.transaction((tx) => PromiseUtils.withTimeout(Promise.resolve(tx('users').where('id', userId).first('id').forUpdate())
      .then(() => DuelystFirebase.connect().getRootRef()).then(function (fbRootRef) {
        _chainState.fbRootRef = fbRootRef;

        const bossEventsRef = _chainState.fbRootRef.child('boss-events');
        return FirebasePromises.once(bossEventsRef, 'value');
      })
      .then(function (bossEventsSnapshot) {
        const bossEventsData = bossEventsSnapshot.val();
        // data will have
        // event-id :
        //   event_id
        //    boss_id
        //   event_start
        //   event_end
        //   valid_end (event_end + 30 minute buffer)
        _chainState.matchingEventData = null;
        for (var eventId in bossEventsData) {
          var eventData = bossEventsData[eventId];
          if (eventData.boss_id !== bossId) {
            continue;
          }
          if (eventData.event_start > MOMENT_NOW_UTC.valueOf()) {
            continue;
          }
          if (eventData.valid_end < MOMENT_NOW_UTC.valueOf()) {
            continue;
          }

          // Reaching here means we have a matching event
          _chainState.matchingEventData = eventData;
          _chainState.matchingEventId = eventData.event_id;
          break;
        }

        if ((_chainState.matchingEventData == null)) {
          Logger.module('CosmeticChestsModule').debug(`updateUserChestRewardWithBossGameOutcome() -> no matching boss event id for user ${userId} in game ${gameId}.`.red);
          return Promise.reject(new Error(`Can not updateUserChestRewardWithBossGameOutcome(): No matching boss event - ${gameId}`));
        }
      })
      .then(function () {
        return Promise.all([
          tx('user_cosmetic_chests').where('user_id', userId).andWhere('boss_id', bossId).andWhere('boss_event_id', _chainState.matchingEventId)
            .first()
            .forUpdate(),
          tx('user_cosmetic_chests_opened').where('user_id', userId).andWhere('boss_id', bossId).andWhere('boss_event_id', _chainState.matchingEventId)
            .first()
            .forUpdate(),
          /*
           * The achievement guard further down reads
           * `_chainState.userProgressionRow.last_crate_awarded_at`, but this function
           * never loaded a progression row -- that read is a copy-paste from the
           * non-boss sibling, which does load one. So it threw whenever a bronze
           * chest was awarded from a boss game. Loading it here makes the guard work
           * as written rather than changing what it means.
           */
          tx('user_progression').where('user_id', userId).first(),
        ]);
      })
      .then(function ([userChestForBossRow, userOpenedChestForBossRow, userProgressionRow]) {
        _chainState.userProgressionRow = userProgressionRow;
        if ((userChestForBossRow != null) || (userOpenedChestForBossRow != null)) {
        // Chest for this boss already earned
          return Promise.resolve([]);
        }

        return CosmeticChestsModule.giveUserChest(txPromise, tx, userId, SDK.CosmeticsChestTypeLookup.Boss, bossId, _chainState.matchingEventData.event_id, 1, 'boss battle', gameId, MOMENT_NOW_UTC);
      })
      .then(function (awardedChestData) {
        _chainState.awardedChestData = awardedChestData;

        const allPromises = [];
        if (_chainState.awardedChestData.length > 0) {
        // reward row
          let rewardData;
          _chainState.rewardData = (rewardData = {
            id: generatePushId(),
            user_id: userId,
            reward_category: 'loot crate',
            reward_type: _chainState.awardedChestData[0].chest_type,
            cosmetic_chests: [_chainState.awardedChestData[0].chest_type],
            game_id: gameId,
            created_at: MOMENT_NOW_UTC.toDate(),
            is_unread: true,
          });
          allPromises.push(tx('user_rewards').insert(rewardData));
          allPromises.push(GamesModule._addRewardIdToUserGame(tx, userId, gameId, rewardData.id));
        }
        return Promise.all(allPromises);
      }), 10000)
      .catch(onType(PromiseUtils.TimeoutError, function (e) {
        Logger.module('CosmeticChestsModule').error(`updateUserChestRewardWithBossGameOutcome() -> ERROR, operation timeout for u:${userId} g:${gameId}`);
        throw e;
      })))
      .then(function () {
        for (var chestData of Array.from<any>(_chainState.awardedChestData)) {
        // Currently there is only an achievement for first bronze chest so don't bother with others
          if ((chestData.chest_type === SDK.CosmeticsChestTypeLookup.Common) && ((_chainState.userProgressionRow.last_crate_awarded_at == null))) {
            Jobs.enqueue('update-user-achievements', {
              name: 'Update User Cosmetic Chest Achievements',
              title: util.format('User %s :: Update Cosmetic Chest Achievements', userId),
              userId,
              receivedCosmeticChestType: chestData.chest_type,
            }, { removeOnComplete: true });
          }
        }

        return _chainState.rewardData;
      }).finally(() => GamesModule.markClientGameJobStatusAsComplete(userId, gameId, 'cosmetic_chests'));

    return txPromise;
  }

  static _chestProbabilityForProgressionData(userProgressionAttrs, systemTime) {
    const lastAwardedAtMoment = moment.utc(userProgressionAttrs.last_crate_awarded_at || 0);
    Logger.module('CosmeticChestsModule').debug('_chestProbabilityForProgressionData() -> last awarded moment: ', lastAwardedAtMoment.format());

    let timeFactor = 1.0;
    if (lastAwardedAtMoment != null) {
      const now = systemTime || moment.utc();
      const diff = now.valueOf() - lastAwardedAtMoment.valueOf();
      const duration = moment.duration(diff);
      const days = duration.asDays(); // this can be partial like 0.3 etc...
      timeFactor = 4 ** (days - 4); // or Math.pow(3,(days-3))
      timeFactor = Math.min(timeFactor, 1.0);
    }

    Logger.module('CosmeticChestsModule').debug(`_chestProbabilityForProgressionData() -> time factor:${timeFactor}`);

    const gameDelta = (userProgressionAttrs.game_count || 0) - (userProgressionAttrs.last_crate_awarded_game_count || 0);
    const gameFactor = Math.min(1.0, gameDelta / CosmeticChestsModule.CHEST_GAME_COUNT_WINDOW);

    Logger.module('CosmeticChestsModule').debug(`_chestProbabilityForProgressionData() -> game delta:${gameDelta}`);
    Logger.module('CosmeticChestsModule').debug(`_chestProbabilityForProgressionData() -> game factor:${gameFactor}`);

    const gameDeltaOverage = Math.max(0.0, gameDelta - (2 * CosmeticChestsModule.CHEST_GAME_COUNT_WINDOW));
    const gameExtraFactor = Math.min(1.0, gameDeltaOverage / (3 * CosmeticChestsModule.CHEST_GAME_COUNT_WINDOW));
    Logger.module('CosmeticChestsModule').debug(`_chestProbabilityForProgressionData() -> game overage:${gameDeltaOverage}`);
    Logger.module('CosmeticChestsModule').debug(`_chestProbabilityForProgressionData() -> game extra factor:${(gameExtraFactor)}`);

    const finalProb = Math.min(1.0, (gameFactor * timeFactor));

    // # add game extra factor
    // finalProb += finalProb * gameExtraFactor * 0.5
    // finalProb = Math.min(1.0,finalProb)

    Logger.module('CosmeticChestsModule').debug(`_chestProbabilityForProgressionData() -> final:${finalProb}`);

    return finalProb;
  }

  static _chestTypeForProgressionData(userProgressionAttrs, systemTime, probabilityOverride) {
    // at least 5 wins needed
    if (userProgressionAttrs.win_count < 5) {
      Logger.module('CosmeticChestsModule').debug('_chestTypeForProgressionData() -> 5 wins required before any chest');
      return null;
    }

    const chestDropRng = probabilityOverride || Math.random();
    const probabilityWindow = 1.0 - CosmeticChestsModule._chestProbabilityForProgressionData(userProgressionAttrs, systemTime);

    Logger.module('CosmeticChestsModule').debug(`_chestTypeForProgressionData() -> rng < probability -> ${chestDropRng} < ${probabilityWindow}`);

    if (chestDropRng < probabilityWindow) {
      return null;
    }

    const chestTypeRng = probabilityOverride || Math.random();

    if (chestTypeRng > 0.95) {
      return SDK.CosmeticsChestTypeLookup.Epic;
    } else if (chestTypeRng > 0.85) {
      return SDK.CosmeticsChestTypeLookup.Rare;
    } else if (chestTypeRng > 0.00) {
      return SDK.CosmeticsChestTypeLookup.Common;
    }

    return null;
  }
}

module.exports = CosmeticChestsModule;

function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}
