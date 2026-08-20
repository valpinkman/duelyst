/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
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

const SDK = require('../../../app/sdk');

class GiftCodesModule {
  static redeemGiftCode(userId, giftCode, systemTime) {
    const _chainState: Record<string, any> = {};
    let txPromise;
    const MOMENT_NOW_UTC = systemTime || moment().utc();

    // userId must be defined
    if (!userId) {
      return Promise.reject(new Error(`Can not claim gift code: invalid user ID - ${userId}`));
    }

    // userId must be defined
    if (!giftCode) {
      return Promise.reject(new Error(`Can not claim gift code: invalid code - ${giftCode}`));
    }

    return txPromise = knex.transaction(function (tx) {
      Promise.all([
        tx('users').first('id', 'created_at').where('id', userId).forUpdate(),
        tx('gift_codes').first().where('code', giftCode).forUpdate(),
        tx('user_progression').first('game_count').where('user_id', userId),
      ])
        .then(function ([userRow, giftCodeRow, progressionRow]) {
          _chainState.giftCodeRow = giftCodeRow;
          _chainState.userRow = userRow;
          _chainState.progressionRow = progressionRow;

          if ((userRow == null)) {
            throw new Errors.NotFoundError('User Not Found');
          }

          if ((giftCodeRow == null)) {
            throw new Errors.NotFoundError('Gift Code Note Found');
          }

          if (giftCodeRow.claimed_at != null) {
            throw new Errors.BadRequestError('This Gift Code has already been claimed.');
          }

          if ((giftCodeRow.valid_for_users_created_after != null) && moment.utc(userRow.created_at).isBefore(moment.utc(giftCodeRow.valid_for_users_created_after))) {
            throw new Errors.BadRequestError('This Gift Code can not be claimed by this account.');
          }

          if ((giftCodeRow.expires_at != null) && moment.utc().isAfter(moment.utc(giftCodeRow.expires_at))) {
            throw new Errors.BadRequestError('This Gift Code has expired.');
          }

          if ((giftCodeRow.game_count_limit != null) && (progressionRow.game_count > giftCodeRow.game_count_limit)) {
            throw new Errors.BadRequestError(`This Gift Code can not be applied to an accont with ${progressionRow.game_count} games played.`);
          }

          let exclusionCheckPromise = Promise.resolve(null);
          if (_chainState.giftCodeRow.exclusion_id != null) {
            exclusionCheckPromise = tx('gift_codes').first().where('claimed_by_user_id', userId).andWhere('exclusion_id', _chainState.giftCodeRow.exclusion_id);
          }

          return exclusionCheckPromise;
        }).then(function (claimedGiftCodeWithMatchingExclusionRow) {
          let card_ids;
          if (claimedGiftCodeWithMatchingExclusionRow != null) {
            throw new Errors.BadRequestError('Gift Code of this type has already been claimed.');
          }

          const allPromises = [];

          // Kickstarter Backers $50 or below
          // 1 of every core set collectible non-prismatic card from every faction except magmar and vanar
          if (_chainState.giftCodeRow.type === 'ks-1') {
            card_ids = _.chain(SDK.GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getIsUnlockable(false).getIsCollectible(true)
              .getIsPrismatic(false)
              .getCards())
              .filter((c) => (c.getFactionId() !== SDK.Factions.Vanar) && (c.getFactionId() !== SDK.Factions.Magmar))
              .map((c) => c.getId())
              .value();
            allPromises.push(InventoryModule.giveUserCards(txPromise, tx, userId, card_ids, 'gift code reward', _chainState.giftCodeRow.code));
          }

          // Kickstarter Backers $60 or above
          // 1 of every core set collectible non-prismatic card
          if (_chainState.giftCodeRow.type === 'ks-2') {
            card_ids = SDK.GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getIsUnlockable(false).getIsCollectible(true)
              .getIsPrismatic(false)
              .getCardIds();
            allPromises.push(InventoryModule.giveUserCards(txPromise, tx, userId, card_ids, 'gift code reward', _chainState.giftCodeRow.code));
          }

          // Currency Reward Code
          if ((_chainState.giftCodeRow.type === 'rewards') || (_chainState.giftCodeRow.type === 'humble')) {
            let i;
            const goldAmount = _chainState.giftCodeRow.rewards != null ? _chainState.giftCodeRow.rewards.gold : undefined;
            const spiritAmount = _chainState.giftCodeRow.rewards != null ? _chainState.giftCodeRow.rewards.spirit : undefined;
            const spiritOrbs = _chainState.giftCodeRow.rewards != null ? _chainState.giftCodeRow.rewards.orbs : undefined;
            const shimzarSpiritOrbs = _chainState.giftCodeRow.rewards != null ? _chainState.giftCodeRow.rewards.shimzar_orbs : undefined;
            const comboSpiritOrbs = _chainState.giftCodeRow.rewards != null ? _chainState.giftCodeRow.rewards.combo_orbs : undefined;
            const unearthedSpiritOrbs = _chainState.giftCodeRow.rewards != null ? _chainState.giftCodeRow.rewards.unearthed_orbs : undefined;
            const immortalSpiritOrbs = _chainState.giftCodeRow.rewards != null ? _chainState.giftCodeRow.rewards.immortal_orbs : undefined;
            const mythronSpiritOrbs = _chainState.giftCodeRow.rewards != null ? _chainState.giftCodeRow.rewards.mythron_orbs : undefined;
            const gauntletTickets = _chainState.giftCodeRow.rewards != null ? _chainState.giftCodeRow.rewards.gauntlet_tickets : undefined;
            const cosmetics = _chainState.giftCodeRow.rewards != null ? _chainState.giftCodeRow.rewards.cosmetics : undefined;
            const cardIds = _chainState.giftCodeRow.rewards != null ? _chainState.giftCodeRow.rewards.card_ids : undefined;
            const crate_keys = _chainState.giftCodeRow.rewards != null ? _chainState.giftCodeRow.rewards.crate_keys : undefined;
            const crates = _chainState.giftCodeRow.rewards != null ? _chainState.giftCodeRow.rewards.crates : undefined;

            if (goldAmount) {
              allPromises.push(InventoryModule.giveUserGold(txPromise, tx, userId, goldAmount, 'gift code', _chainState.giftCodeRow.code));
            }

            if (spiritAmount) {
              allPromises.push(InventoryModule.giveUserSpirit(txPromise, tx, userId, spiritAmount, 'gift code', _chainState.giftCodeRow.code));
            }

            if (spiritOrbs) {
              let asc,
                end;
              for (i = 0, end = spiritOrbs, asc = end >= 0; asc ? i < end : i > end; asc ? i++ : i--) {
                allPromises.push(InventoryModule.addBoosterPackToUser(txPromise, tx, userId, SDK.CardSet.Core, 'gift code', _chainState.giftCodeRow.code));
              }
            }

            if (shimzarSpiritOrbs) {
              let asc1,
                end1;
              for (i = 0, end1 = shimzarSpiritOrbs, asc1 = end1 >= 0; asc1 ? i < end1 : i > end1; asc1 ? i++ : i--) {
                allPromises.push(InventoryModule.addBoosterPackToUser(txPromise, tx, userId, SDK.CardSet.Shimzar, 'gift code', _chainState.giftCodeRow.code));
              }
            }

            if (comboSpiritOrbs) {
              let asc2,
                end2;
              for (i = 0, end2 = comboSpiritOrbs, asc2 = end2 >= 0; asc2 ? i < end2 : i > end2; asc2 ? i++ : i--) {
                allPromises.push(InventoryModule.addBoosterPackToUser(txPromise, tx, userId, SDK.CardSet.CombinedUnlockables, 'gift code', _chainState.giftCodeRow.code));
              }
            }

            if (unearthedSpiritOrbs) {
              let asc3,
                end3;
              for (i = 0, end3 = unearthedSpiritOrbs, asc3 = end3 >= 0; asc3 ? i < end3 : i > end3; asc3 ? i++ : i--) {
                allPromises.push(InventoryModule.addBoosterPackToUser(txPromise, tx, userId, SDK.CardSet.FirstWatch, 'gift code', _chainState.giftCodeRow.code));
              }
            }

            if (immortalSpiritOrbs) {
              let asc4,
                end4;
              for (i = 0, end4 = immortalSpiritOrbs, asc4 = end4 >= 0; asc4 ? i < end4 : i > end4; asc4 ? i++ : i--) {
                allPromises.push(InventoryModule.addBoosterPackToUser(txPromise, tx, userId, SDK.CardSet.Wartech, 'gift code', _chainState.giftCodeRow.code));
              }
            }

            if (mythronSpiritOrbs) {
              let asc5,
                end5;
              for (i = 0, end5 = mythronSpiritOrbs, asc5 = end5 >= 0; asc5 ? i < end5 : i > end5; asc5 ? i++ : i--) {
                allPromises.push(InventoryModule.addBoosterPackToUser(txPromise, tx, userId, SDK.CardSet.Coreshatter, 'gift code', _chainState.giftCodeRow.code));
              }
            }

            if (gauntletTickets) {
              let asc6,
                end6;
              for (i = 0, end6 = gauntletTickets, asc6 = end6 >= 0; asc6 ? i < end6 : i > end6; asc6 ? i++ : i--) {
                allPromises.push(InventoryModule.addArenaTicketToUser(txPromise, tx, userId, 'gift code', _chainState.giftCodeRow.code));
              }
            }

            if (cosmetics) {
              for (var cosmetic of Array.from<any>(cosmetics)) {
                allPromises.push(InventoryModule.giveUserCosmeticId(txPromise, tx, userId, cosmetic, 'gift code', _chainState.giftCodeRow.code));
              }
            }

            if (cardIds != null) {
              allPromises.push(InventoryModule.giveUserCards(txPromise, tx, userId, cardIds, 'gift code', _chainState.giftCodeRow.code));
            }

            if (crates != null) {
              for (var crateType of Array.from<any>(crates)) {
                allPromises.push(CosmeticChestsModule.giveUserChest(txPromise, tx, userId, crateType, null, null, 1, 'gift code', _chainState.giftCodeRow.code));
              }
            }

            if (crate_keys != null) {
              for (var keyType of Array.from<any>(crate_keys)) {
                allPromises.push(CosmeticChestsModule.giveUserChestKey(txPromise, tx, userId, keyType, 1, 'gift code', _chainState.giftCodeRow.code));
              }
            }
          }

          allPromises.push(tx('gift_codes').where('code', giftCode).update({
            claimed_by_user_id: _chainState.userRow.id,
            claimed_at: MOMENT_NOW_UTC.toDate(),
          }),
          );

          return Promise.all(allPromises);
        })
        .then(() => SyncModule._bumpUserTransactionCounter(tx, userId))
        .then(tx.commit)
        .catch(tx.rollback);
    })
      .then(function () {
        Logger.module('GiftCodesModule').debug(`redeemGiftCode() -> user ${userId.blue} `.green + ` reedemed code ${giftCode}`.green);
        return Promise.resolve(_chainState.giftCodeRow);
      });
  }
}

module.exports = GiftCodesModule;
