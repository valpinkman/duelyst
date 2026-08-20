/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
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
const SyncModule = require('./sync');
const InventoryModule = require('./inventory');
const CosmeticChestsModule = require('./cosmetic_chests');
const Errors = require('../custom_errors');
const knex = require('./knex');
const config = require('../../../config/config.js');
const generatePushId = require('../../../app/common/generate_push_id');

// SDK imports
const SDK = require('../../../app/sdk');

class TwitchModule {
  /**
   * Gives a user a number of objects for twitch rewards
   * @public
   * @param  {Promise}    trxPromise          Transaction promise that resolves if transaction succeeds.
   * @param  {Transaction}  trx              KNEX transaction to attach this operation to.
   * @param  {String}    userId            User ID for which to buy a booster pack.
   * @param  {String}    transactionType        'soft','hard','gauntlet', or 'xp'.
   * @param  {String}    transactionId        the identifier for the transaction that caused this ticket to be added.
   * @return  {Promise}    Promise that will post TICKET ID on completion.
   */
  static giveUserTwitchRewards(txPromise, tx, userId, items, systemTime) {
    // userId must be defined
    if (!userId) {
      Logger.module('TwitchModule').debug(`giveUserTwitchRewards() -> invalid user ID - ${userId}.`.red);
      return Promise.reject(new Error(`Can not give user Twitch Drops : invalid user ID - ${userId}`));
    }

    // userId must be defined
    if (!tx) {
      Logger.module('TwitchModule').debug(`giveUserTwitchRewards() -> invalid trx - ${tx}.`.red);
      return Promise.reject(new Error('Can not give user Twitch Drops : invalid transaction parameter'));
    }

    // items must be defined
    if (!items) {
      Logger.module('TwitchModule').debug(`giveUserTwitchRewards() -> invalid items - ${items}.`.red);
      return Promise.reject(new Error('Can not give user Twitch Drops : invalid items'));
    }

    // items must be non 0 length
    if (items.length === 0) {
      Logger.module('TwitchModule').debug(`giveUserTwitchRewards() -> empty items - ${items}.`.red);
      return Promise.reject(new Error('Can not give user Twitch Drops : empty items list'));
    }

    const MOMENT_NOW_UTC = (systemTime = moment.utc());

    const rewardObjects = [];
    const allRewardPromises = [];

    // Current known rewards list:
    /*
    Epic Key
    Rare Key
    Core Orb
    Expansion Orb
    Core Orb
    Expansion Orb
    Common Key
    Core Orb
    Expansion Orb
    Gold Box
    Spirit Box
    Emote
    Profile Icon
    */

    for (var item of Array.from<any>(items)) {
      var rngSeed;
      var twitchRewardId = generatePushId();

      // Set default reward data
      var rewardObject: Record<string, any> = {
        id: generatePushId(),
        user_id: userId,
        reward_category: 'twitch reward',
        reward_type: twitchRewardId,
        created_at: MOMENT_NOW_UTC.toDate(),
        is_unread: true,
      };

      var itemId = item.item_id;
      var itemQuantity = item.quantity;
      var itemDescription = item.description || null;
      var rewardCategory = item.source || 'twitch reward';

      if (_.isString(itemQuantity)) {
        itemQuantity = parseInt(itemQuantity);
      }

      // item id must be valid
      if ((item.item_id == null) || !_.isString(item.item_id)) {
        Logger.module('TwitchModule').debug(`giveUserTwitchRewards() -> invalid item id - ${item.item_id}.`.red);
        return Promise.reject(new Error('Can not give user Twitch Drops : contains invalid item id'));
      }

      // item quantity must be valid
      if ((item.quantity == null) || !_.isFinite(item.quantity)) {
        Logger.module('TwitchModule').debug(`giveUserTwitchRewards() -> invalid item quantity - ${item.quantity}.`.red);
        return Promise.reject(new Error('Can not give user Twitch Drops : contains invalid item quantity'));
      }

      //      # item description must be valid
      //      if not item.description?
      //        Logger.module("TwitchModule").debug "giveUserTwitchRewards() -> invalid item quantity - #{item.description}.".red
      //        return Promise.reject(new Error("Can not give user Twitch Drops : contains invalid item description"))

      rewardObject.reward_category = rewardCategory;

      // perform any reward conversions needed
      if (itemId === 'core_orb') {
        //        rewardObject['spirit_orbs'] = 1
        // Handled below
      } else if (itemId === 'expansion_orb') {
        //        rewardObject['spirit_orbs'] = SDK.CardSet.Wartech
        // Handled belor
      } else if (itemId === 'gold_box') {
        rngSeed = Math.random();
        var goldAmount = null;
        if (rngSeed < 0.50) {
          goldAmount = 25;
        } else if (rngSeed < 0.70) {
          goldAmount = 50;
        } else if (rngSeed < 0.84) {
          goldAmount = 75;
        } else if (rngSeed < 0.94) {
          goldAmount = 100;
        } else if (rngSeed < 0.99) {
          goldAmount = 125;
        } else {
          goldAmount = 150;
        }
        rewardObject.gold = goldAmount;
      } else if (itemId === 'gold') {
        rewardObject.gold = itemQuantity;
      } else if (itemId === 'spirit_box') {
        rngSeed = Math.random();
        var spiritAmount = null;
        if (rngSeed < 0.50) {
          spiritAmount = 40;
        } else if (rngSeed < 0.75) {
          spiritAmount = 100;
        } else if (rngSeed < 0.90) {
          spiritAmount = 200;
        } else if (rngSeed < 0.97) {
          spiritAmount = 300;
        } else {
          spiritAmount = 450;
        }
        rewardObject.spirit = spiritAmount;
      } else if (itemId === 'spirit') {
        rewardObject.spirit = itemQuantity;
      } else if (itemId === 'common_key') {
        if (rewardObject.cosmetic_keys == null) { rewardObject.cosmetic_keys = []; }
        rewardObject.cosmetic_keys.push(SDK.CosmeticsChestTypeLookup.Common);
      } else if (itemId === 'epic_key') {
        if (rewardObject.cosmetic_keys == null) { rewardObject.cosmetic_keys = []; }
        rewardObject.cosmetic_keys.push(SDK.CosmeticsChestTypeLookup.Epic);
      } else if (itemId === 'rare_key') {
        if (rewardObject.cosmetic_keys == null) { rewardObject.cosmetic_keys = []; }
        rewardObject.cosmetic_keys.push(SDK.CosmeticsChestTypeLookup.Rare);
      } else if (itemId === 'profile_icon') {
        // Handled below
      } else if (itemId === 'emote') {
        // Handled below
      } else {
        Logger.module('TwitchModule').debug(`giveUserTwitchRewards() -> unknown item id - ${itemId}.`.red);
        return Promise.reject(new Error('Can not give user Twitch Drops : unknown item id'));
      }

      // Give user rewards
      if (rewardObject.gold) {
        allRewardPromises.push(InventoryModule.giveUserGold(txPromise, tx, userId, rewardObject.gold, 'twitch', twitchRewardId));
      }
      if (rewardObject.spirit) { allRewardPromises.push(InventoryModule.giveUserSpirit(txPromise, tx, userId, rewardObject.spirit, 'twitch', twitchRewardId)); }
      if (rewardObject.cards) { allRewardPromises.push(InventoryModule.giveUserCards(txPromise, tx, userId, rewardObject.cards, 'twitch', twitchRewardId)); }
      if (rewardObject.gauntlet_tickets) { allRewardPromises.push(InventoryModule.addArenaTicketToUser(txPromise, tx, userId, 'twitch', twitchRewardId)); }
      if (rewardObject.cosmetics) {
        for (var cosmeticId of Array.from<any>(rewardObject.cosmetics)) {
          allRewardPromises.push(InventoryModule.giveUserCosmeticId(txPromise, tx, userId, cosmeticId, 'twitch', twitchRewardId, null, MOMENT_NOW_UTC));
        }
      }
      if (rewardObject.cosmetic_keys) {
        for (var keyType of Array.from<any>(rewardObject.cosmetic_keys)) {
          allRewardPromises.push(CosmeticChestsModule.giveUserChestKey(txPromise, tx, userId, keyType, 1, 'twitch', twitchRewardId, MOMENT_NOW_UTC));
        }
      }

      // random un-owned cosmetics needs special handling
      if (itemId === 'profile_icon') {
        var profileRarityId = null; // TODO: means any rarity, do we want to choose one?
        allRewardPromises.push((InventoryModule.giveUserNewPurchasableCosmetic(txPromise, tx, userId, 'twitch', twitchRewardId, profileRarityId, SDK.CosmeticsTypeLookup.ProfileIcon, null, MOMENT_NOW_UTC)
          .then((cosmeticReward) => {
            rewardObject = {
              id: generatePushId(),
              user_id: userId,
              reward_category: rewardCategory,
              reward_type: twitchRewardId,
              created_at: MOMENT_NOW_UTC.toDate(),
              is_unread: true,
            };
            if ((cosmeticReward != null) && (cosmeticReward.cosmetic_id != null)) {
              if (rewardObject.cosmetics == null) { rewardObject.cosmetics = []; }
              rewardObject.cosmetics.push(cosmeticReward.cosmetic_id);
            }
            if (cosmeticReward.spirit != null) {
              if (rewardObject.spirit == null) { rewardObject.spirit = 0; }
              rewardObject.spirit += cosmeticReward.spirit;
            }

            const profileRewardPromises = [];
            profileRewardPromises.push(tx('user_rewards').insert(rewardObject));
            profileRewardPromises.push(tx('user_twitch_rewards').insert({
              twitch_reward_id: generatePushId(),
              user_id: userId,
              reward_ids: [rewardObject.id],
              created_at: MOMENT_NOW_UTC.toDate(),
              description: itemDescription,
            }),
            );
            return Promise.all(profileRewardPromises);
          })),
        );
      } else if (itemId === 'emote') {
        var emoteRarityId = null; // TODO: means any rarity, do we want to choose one?
        allRewardPromises.push((InventoryModule.giveUserNewPurchasableCosmetic(txPromise, tx, userId, 'twitch', twitchRewardId, emoteRarityId, SDK.CosmeticsTypeLookup.Emote, null, MOMENT_NOW_UTC)
          .then((cosmeticReward) => {
            rewardObject = {
              id: generatePushId(),
              user_id: userId,
              reward_category: rewardCategory,
              reward_type: twitchRewardId,
              created_at: MOMENT_NOW_UTC.toDate(),
              is_unread: true,
            };
            if ((cosmeticReward != null) && (cosmeticReward.cosmetic_id != null)) {
              if (rewardObject.cosmetics == null) { rewardObject.cosmetics = []; }
              rewardObject.cosmetics.push(cosmeticReward.cosmetic_id);
            }
            if (cosmeticReward.spirit != null) {
              if (rewardObject.spirit == null) { rewardObject.spirit = 0; }
              rewardObject.spirit += cosmeticReward.spirit;
            }

            const emoteRewardPromise = [];
            emoteRewardPromise.push(tx('user_rewards').insert(rewardObject));
            emoteRewardPromise.push(tx('user_twitch_rewards').insert({
              twitch_reward_id: generatePushId(),
              user_id: userId,
              reward_ids: [rewardObject.id],
              created_at: MOMENT_NOW_UTC.toDate(),
              description: itemDescription,
            }),
            );
            return Promise.all(emoteRewardPromise);
          })),
        );
      } else if ((itemId === 'expansion_orb') || (itemId === 'core_orb')) {
        var orbType = SDK.CardSet.Core;
        if (itemId === 'expansion_orb') {
          orbType = SDK.CardSet.Coreshatter;
        }
        for (var i = 0, end = itemQuantity, asc = end >= 0; asc ? i < end : i > end; asc ? i++ : i--) {
          // Need to enter spirit orbs as separate reward rows, so this will regenerate unique push ids
          twitchRewardId = generatePushId();
          rewardObject = {
            id: generatePushId(),
            user_id: userId,
            reward_category: rewardCategory,
            reward_type: twitchRewardId,
            created_at: MOMENT_NOW_UTC.toDate(),
            spirit_orbs: orbType,
            is_unread: true,
          };
          allRewardPromises.push(tx('user_rewards').insert(rewardObject));
          allRewardPromises.push(tx('user_twitch_rewards').insert({
            twitch_reward_id: twitchRewardId,
            user_id: userId,
            reward_ids: [rewardObject.id],
            created_at: MOMENT_NOW_UTC.toDate(),
            description: itemDescription,
          }),
          );
          allRewardPromises.push(InventoryModule.addBoosterPackToUser(txPromise, tx, userId, rewardObject.spirit_orbs, 'twitch', twitchRewardId));
        }
      } else {
        allRewardPromises.push(tx('user_rewards').insert(rewardObject));
        allRewardPromises.push(tx('user_twitch_rewards').insert({
          twitch_reward_id: twitchRewardId,
          user_id: userId,
          reward_ids: [rewardObject.id],
          created_at: MOMENT_NOW_UTC.toDate(),
          description: itemDescription,
        }),
        );
      }
    }

    return Promise.all(allRewardPromises)
      .then(() => DuelystFirebase.connect().getRootRef())
      .then((fbRootRef) => FirebasePromises.set(fbRootRef.child('user-twitch-rewards').child(userId).child('status').child('last_earned_at'), MOMENT_NOW_UTC.valueOf()));
  }
}

module.exports = TwitchModule;
