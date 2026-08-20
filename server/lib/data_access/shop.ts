/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS202: Simplify dynamic range loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Promise = require('bluebird');
const util = require('util');
const moment = require('moment');
const _ = require('underscore');

const FirebasePromises = require('../firebase_promises');
const DuelystFirebase = require('../duelyst_firebase_module');
const Logger = require('../../../app/common/logger');
const Errors = require('../custom_errors');
const knex = require('./knex');
const generatePushId = require('../../../app/common/generate_push_id');
const { Jobs } = require('../../redis');
const ShopData = require('app/data/shop.json');
const CosmeticsFactory = require('app/sdk/cosmetics/cosmeticsFactory');
const CosmeticsTypeLookup = require('app/sdk/cosmetics/cosmeticsTypeLookup');
const InventoryModule = require('./inventory');
const UsersModule = require('./users');
const CosmeticChestsModule = require('./cosmetic_chests');
const SyncModule = require('./sync');
const RiftModule = require('./rift');
const GiftCrateModule = require('./gift_crate');

class ShopModule {
  static SHOP_SALE_BUFFER_MINUTES = 5;

  static _addChargeToUser(txPromise, tx, userRow, userId, sku, price, currencyCode, chargeId, chargeJson, paymentType, createdAt) {
    let allPromises = [];

    const updateParams = {
      ltv: userRow.ltv + price,
      purchase_count: userRow.purchase_count + 1,
      last_purchase_at: createdAt.toDate(),
    };

    if (!userRow.first_purchased_at) {
      updateParams.first_purchased_at = createdAt.toDate();
    }

    allPromises.push(tx('users').where('id', userId).update(updateParams));

    allPromises.push(tx('user_charges').insert({
      charge_id: chargeId,
      user_id: userId,
      payment_type: paymentType,
      created_at: createdAt.toDate(),
      amount: price,
      currency: currencyCode,
      charge_json: chargeJson,
      sku,
    }),
    );

    const totalPlatinumAmount = chargeJson != null ? chargeJson.total_platinum_amount : undefined;
    if (totalPlatinumAmount != null) {
      allPromises.push(tx('user_currency_log').insert({
        id: generatePushId(),
        user_id: userId,
        premium_currency: totalPlatinumAmount,
        sku,
        memo: 'premium currency purchase',
        created_at: createdAt.toDate(),
      }),
      );
    }

    // This is specifically for trimmed data we deem acceptable for a player to see
    const fbReceiptData = {
      created_at: createdAt.valueOf(),
      sku,
      price,
    };
    if (chargeJson != null) {
      if (chargeJson.total_platinum_amount != null) {
        fbReceiptData.total_platinum_amount = chargeJson.total_platinum_amount;
      }
      if (chargeJson.transaction_id != null) {
        fbReceiptData.transaction_id = chargeJson.transaction_id;
      }
      if (chargeJson.type != null) {
        fbReceiptData.type = chargeJson.type;
      }
    }

    txPromise
      .then(() => DuelystFirebase.connect().getRootRef())
      .then(function (rootRef) {
        FirebasePromises.setWithPriority(rootRef.child('user-charges').child(userId).child(chargeId), chargeJson, createdAt.valueOf());
        FirebasePromises.setWithPriority(rootRef.child('user-premium-receipts').child(userId).child(chargeId), fbReceiptData, createdAt.valueOf());
        return FirebasePromises.safeTransaction(rootRef.child('user-purchase-counts').child(userId).child(sku), function (purchaseCountRecord) {
          if (purchaseCountRecord == null) { purchaseCountRecord = {}; }
          if (purchaseCountRecord.count == null) { purchaseCountRecord.count = 0; }
          purchaseCountRecord.count += 1;
          return purchaseCountRecord;
        });
      });

    return Promise.all(allPromises)
      .then(() => DuelystFirebase.connect().getRootRef())
      .then(function (rootRef) {
        allPromises = [];
        const updateUserLtv = function (userData) {
          if (userData) {
            if (userData.ltv == null) { userData.ltv = 0; }
            userData.ltv += price;
          }
          return userData;
        };
        // save a reference of the charge to auth firebase
        allPromises.push(FirebasePromises.safeTransaction(rootRef.child('users').child(userId), updateUserLtv));
        return Promise.all(allPromises);
      });
  }

  /**
   * Updates a user's currency log and related fields with having made a purchase with premium currency
   * @public
   * @param  {String}  userId    User ID.
   * @param  {Object}  userRow    User db data
   * @param  {String}  sku        sku of product purchased
   * @param  {int}  price          A positive integer in the smallest currency unit
   * @param  {String}  shopSaleId    id of shop sale used or none
   * @return  {Promise}
   */
  static _addPremiumChargeToUser(txPromise, tx, userId, userRow, sku, price, shopSaleId, systemTime) {
    const allPromises = [];

    const NOW_UTC_MOMENT = systemTime || moment.utc();

    if (sku === 'STARTERBUNDLE_201604') {
      const updateParams = {};
      updateParams.has_purchased_starter_bundle = true;
      allPromises.push(tx('users').where('id', userId).update(updateParams));
    }

    allPromises.push(tx('user_currency_log').insert({
      id: generatePushId(),
      user_id: userId,
      premium_currency: (price * -1),
      sku,
      memo: 'premium shop purchase',
      sale_id: shopSaleId,
      created_at: NOW_UTC_MOMENT.toDate(),
    }),
    );

    if ((userRow.referred_by_user_id != null) && (userRow.purchase_count === 0)) {
      // kick off a job to process this referral event
      Jobs.create('process-user-referral-event', {
        name: 'Process User Referral Event',
        title: util.format('User %s :: Generated Referral Event %s', userRow.id, 'purchase'),
        userId: userRow.id,
        eventType: 'purchase',
        referrerId: userRow.referred_by_user_id,
      },
      ).removeOnComplete(true).ttl(15000).save();
    }

    txPromise
      .then(() => DuelystFirebase.connect().getRootRef())
      .then(function (rootRef) {
        FirebasePromises.safeTransaction(rootRef.child('user-purchase-counts').child(userId).child(sku), function (purchaseCountRecord) {
          if (purchaseCountRecord == null) { purchaseCountRecord = {}; }
          if (purchaseCountRecord.count == null) { purchaseCountRecord.count = 0; }
          purchaseCountRecord.count += 1;
          return purchaseCountRecord;
        });
        if (sku === 'STARTERBUNDLE_201604') {
          return FirebasePromises.set(rootRef.child('users').child(userId).child('has_purchased_starter_bundle'), true);
        }
      });

    return Promise.all(allPromises)
      .then(() => // Send update to achievements job for armory purchase
        Jobs.create('update-user-achievements', {
          name: 'Update User Armory Achievements',
          title: util.format('User %s :: Update Armory Achievements', userId),
          userId,
          armoryPurchaseSku: sku,
        },
        ).removeOnComplete(true).save());
  }

  /**
   * @public
   * @param  {String}    userId          User ID.
   * @param  {String}    sku            Product SKU.
   * @param  {String|null}  shopSaleId        Sale Id to use for transaction or null if none used
   * @return  {Promise}              Promise that will resolve when done.
   */
  static purchaseProductWithPremiumCurrency(userId, sku, shopSaleId) {
    const _chainState: Record<string, any> = {};
    Logger.module('ShopModule').debug(`purchaseProductWithPremiumCurrency() -> user ${userId} buying ${sku}`);

    // userId must be defined
    if (!userId) {
      Logger.module('ShopModule').debug(`purchaseProductWithPremiumCurrency() -> invalid user ID - ${(userId != null ? userId.blue : undefined)}.`.red);
      return Promise.reject(new Error(`Can not process purchase : invalid user ID - ${userId}`));
    }

    // sku must be defined
    if (!sku) {
      Logger.module('ShopModule').debug(`purchaseProductWithPremiumCurrency() -> invalid SKU - ${(sku != null ? sku.blue : undefined)}.`.red);
      return Promise.reject(new Error(`Can not process purchase : invalid SKU - ${sku}`));
    }

    const NOW_UTC_MOMENT = moment.utc();
    const this_obj = {};

    const productData = ShopModule.productDataForSKU(sku);

    if ((productData == null)) {
      Logger.module('ShopModule').debug(`purchaseProductWithPremiumCurrency() -> no product found for SKU - ${(sku != null ? sku.blue : undefined)}.`.red);
      return Promise.reject(new Errors.NotFoundError(`Could not find product for SKU - ${sku}`));
    }

    this_obj.premCurrencyPrice = productData.price;

    if (this_obj.premCurrencyPrice === 0) {
      return Promise.reject(new Errors.NotFoundError(`Could not find price for product: ${sku}`));
    }

    var txPromise = knex.transaction((tx) => tx('users').where('id', userId).first('ltv', 'username', 'has_purchased_starter_bundle')
      .bind(this_obj)
      .then(function (userRow) {
        _chainState.userRow = userRow;

        if ((sku === 'STARTERBUNDLE_201604') && userRow.has_purchased_starter_bundle) {
          throw new Errors.AlreadyExistsError('Player already purchased the starter bundle.');
        }

        if (productData.purchase_limit != null) {
          return tx('user_currency_log').count().where('user_id', userId).andWhere('sku', sku)
            .then(function (count) {
              count = parseInt(count[0].count);
              Logger.module('InventoryModule').debug(`purchaseProductWithPremiumCurrency() -> product ${sku} has a purchase limit of ${productData.purchase_limit} and user ${userId.blue} has purchased ${count} so far.`);
              if (count >= productData.purchase_limit) {
                throw new Errors.AlreadyExistsError('This product has already been purchased.');
              }
            });
        }

        if (productData.type === 'cosmetic') {
          return tx('user_cosmetic_inventory').where('user_id', userId).andWhere('cosmetic_id', productData.id).first()
            .then(function (row) {
              if (row != null) {
                throw new Errors.AlreadyExistsError('This cosmetic item is already in the user inventory.');
              }
            });
        }
      })
      .then(function () {
        if ((shopSaleId == null)) {
        // Checks to make sure that a user isn't paying full price for an item that's on sale
          const bufferedTimeToExpireSales = NOW_UTC_MOMENT.clone().subtract(ShopModule.SHOP_SALE_BUFFER_MINUTES, 'minutes');
          return tx('shop_sales').first().where('sku', sku).andWhere('sale_starts_at', '<', NOW_UTC_MOMENT.toDate())
            .andWhere('sale_ends_at', '>', bufferedTimeToExpireSales.toDate())
            .andWhere('disabled', '=', false)
            .bind(_chainState)
            .then(function (shopSaleRow) {
              if (shopSaleRow != null) {
                throw new Error(`Attempting to purchase an item ${sku} that is on sale ${shopSaleRow.sale_id} without sale price.`);
              } else {
                return Promise.resolve();
              }
            });
        } else {
        // Check if there is a matching active sale if provided with a sale id
          return tx('shop_sales').first().where('sale_id', shopSaleId)
            .bind(_chainState)
            .then(function (shopSaleRow) {
              if ((shopSaleRow == null)) {
                throw new Errors.ShopSaleDoesNotExistError(`There is no matching sale with id (${shopSaleId}) for product sku ${sku}.`);
              } else if ((shopSaleRow.sale_starts_at == null) || moment.utc(shopSaleRow.sale_starts_at).isAfter(NOW_UTC_MOMENT)) {
                throw new Errors.ShopSaleDoesNotExistError(`Matching sale with id (${shopSaleId}) for product sku ${sku} has not started.`);
              } else if ((shopSaleRow.sale_ends_at == null) || moment.utc(shopSaleRow.sale_ends_at).add(ShopModule.SHOP_SALE_BUFFER_MINUTES, 'minutes').isBefore(NOW_UTC_MOMENT)) {
                throw new Errors.ShopSaleDoesNotExistError(`Matching sale with id (${shopSaleId}) for product sku ${sku} has expired.`);
              } else if (shopSaleRow.disabled) {
                throw new Error(`Matching sale with id (${shopSaleId}) for product sku ${sku} is disabled.`);
              } else if (shopSaleRow.sku !== sku) {
                throw new Errors.ShopSaleDoesNotExistError(`No matching sale with id (${shopSaleId}) for product sku ${sku}.`);
              } else {
                // Matching sale success
                _chainState.premCurrencyPrice = shopSaleRow.sale_price;
                return Promise.resolve();
              }
            });
        }
      })
      .then(function () {
      // txPromise,trx,userId,amount,memo
        return InventoryModule.debitPremiumFromUser(txPromise, tx, userId, _chainState.premCurrencyPrice);
      })
      .then(function () {
      // txPromise, tx, userId, userRow, sku, price, shopSaleId, systemTime
        return ShopModule._addPremiumChargeToUser(txPromise, tx, userId, _chainState.userRow, sku, _chainState.premCurrencyPrice, shopSaleId, NOW_UTC_MOMENT);
      })
      .then(() => ShopModule._awardProductDataContents(txPromise, tx, userId, generatePushId(), productData, NOW_UTC_MOMENT))
      .then(function (value) {
        return _chainState.to_return = value;
      })
      .then(() => SyncModule._bumpUserTransactionCounter(tx, userId))).bind(this_obj)
      .then(function () {
        return _chainState.to_return;
      });

    return txPromise
      .then(() => DuelystFirebase.connect().getRootRef());
  }

  static _awardProductDataContents(txPromise, tx, userId, chargeId, productData, systemTime) {
    let cosmeticId,
      i;
    const NOW_UTC_MOMENT = systemTime || moment.utc();
    const allPromises = [];

    // Create an array of promises of booster pack push calls
    if (productData.type === 'card_pack') {
      let asc,
        end;
      for (i = 1, end = productData.qty, asc = end >= 1; asc ? i <= end : i >= end; asc ? i++ : i--) {
        allPromises.push(InventoryModule.addBoosterPackToUser(txPromise, tx, userId, productData.card_set, 'hard', chargeId));
      }
    }

    // Create an array of promises of booster pack push calls
    if (productData.type === 'gauntlet_tickets') {
      let asc1,
        end1;
      for (i = 1, end1 = productData.qty, asc1 = end1 >= 1; asc1 ? i <= end1 : i >= end1; asc1 ? i++ : i--) {
        allPromises.push(InventoryModule.addArenaTicketToUser(txPromise, tx, userId, 'hard', chargeId));
      }
    }

    // Create an array of promises
    if (productData.type === 'cosmetic') {
      allPromises.push(InventoryModule.giveUserCosmeticId(txPromise, tx, userId, productData.id, 'hard', chargeId));
    }

    // if this product is supposed to bundle cosmetics
    // NOTE: "cosmetics_bundle" is a product type that ONLY bundles cosmetics, but any product can bundle cosmetics
    // Create an array of promises
    if ((productData.bundle_cosmetic_ids != null ? productData.bundle_cosmetic_ids.length : undefined) > 0) {
      for (cosmeticId of Array.from<any>(productData.bundle_cosmetic_ids)) {
        allPromises.push(InventoryModule.giveUserCosmeticId(txPromise, tx, userId, cosmeticId, 'hard', chargeId));
      }
    }

    if (productData.type === 'loot_chest_key') {
      allPromises.push(CosmeticChestsModule.giveUserChestKey(txPromise, tx, userId, productData.chest_type, productData.qty, 'hard', chargeId));
    }

    if (productData.type === 'starter_bundle') {
      for (var orbsData of Array.from<any>(productData.spirit_orbs)) {
        var asc2,
          end2;
        for (i = 1, end2 = orbsData.count, asc2 = end2 >= 1; asc2 ? i <= end2 : i >= end2; asc2 ? i++ : i--) {
          allPromises.push(InventoryModule.addBoosterPackToUser(txPromise, tx, userId, orbsData.card_set, 'hard', chargeId));
        }
      }
    }

    if (productData.type === 'newbie_bundle') {
      allPromises.push(InventoryModule.giveUserCards(txPromise, tx, userId, productData.cards, 'hard', chargeId));
      for (cosmeticId of Array.from<any>(productData.cosmeticIds)) {
        allPromises.push(InventoryModule.giveUserCosmeticId(txPromise, tx, userId, cosmeticId, 'hard', chargeId));
      }
    }

    if (productData.type === 'complete_card_set') {
      allPromises.push(InventoryModule.addRemainingOrbsForCardSetToUser(txPromise, tx, userId, productData.card_set, false, 'hard', chargeId));
    }

    if (productData.type === 'rift_tickets') {
      let asc3,
        end3;
      for (i = 1, end3 = productData.qty, asc3 = end3 >= 1; asc3 ? i <= end3 : i >= end3; asc3 ? i++ : i--) {
        allPromises.push(RiftModule.addRiftTicketToUser(txPromise, tx, userId, 'hard', chargeId));
      }
    }

    if (productData.type === 'gift_crate') {
      let asc4,
        end4;
      for (i = 1, end4 = productData.qty, asc4 = end4 >= 1; asc4 ? i <= end4 : i >= end4; asc4 ? i++ : i--) {
        allPromises.push(GiftCrateModule.addGiftCrateToUser(txPromise, tx, userId, productData.crate_type, chargeId));
      }
    }

    // when we're all done with the entire promise chain, set the battlemap if one was purchased
    txPromise.then(function () {
      if ((productData.type === 'cosmetic') && (__guard__(CosmeticsFactory.cosmeticForIdentifier(productData.id), (x) => x.typeId) === CosmeticsTypeLookup.BattleMap)) {
        return UsersModule.setBattleMapId(userId, productData.id);
      }
    });

    return Promise.all(allPromises);
  }

  static _allProducts() {
    const categories = _.keys(ShopData);
    // Logger.module("ShopModule").debug "all categories:", categories
    const categoryProducts = _.map(categories, (category) => _.values(ShopData[category]));
    const allProducts = _.flatten(categoryProducts);
    // Logger.module("ShopModule").debug "all products:", allProducts
    return allProducts;
  }

  /**
   * Grab product JSON definition from product catalog
   * @public
   * @param  {String}  sku            Product SKU to grab data for.
   * @return  {Object}              JSON product definition.
   */
  static productDataForSKU(sku) {
    let productData = _.find(ShopModule._allProducts(), (p) => p.sku === sku);
    return productData != null ? productData : (productData = CosmeticsFactory.cosmeticProductAttrsForSKU(sku));
  }

  static creditUserPremiumCurrency(txPromise, tx, userId, amount) {
    const _chainState: Record<string, any> = {};
    // userId must be defined
    if ((userId == null)) {
      return Promise.reject(new Error(`giveUserPremiumCurrency: invalid user ID - ${userId}`));
    }

    amount = parseInt(amount);
    if ((amount == null) || (amount <= 0) || _.isNaN(amount)) {
      return Promise.reject(new Error(`giveUserPremiumCurrency: invalid amount - ${amount}`));
    }

    const this_obj = {};

    const trxPromise = knex.transaction((tx) => tx('users').where('id', userId).first('id').forUpdate()
      .bind(this_obj)
      .then(function (userRow) {
        _chainState.userRow = userRow;

        return tx('user_premium_currency').where('user_id', userId).first('amount');
      })
      .then(function (userPremCurrencyRow) {
        const allPromises = [];

        let needsInsert = false;
        if ((userPremCurrencyRow == null)) {
          needsInsert = true;
          userPremCurrencyRow = { user_id: userId };
        }
        _chainState.userPremCurrencyRow = userPremCurrencyRow;
        if (_chainState.userPremCurrencyRow.amount == null) { _chainState.userPremCurrencyRow.amount = 0; }
        _chainState.userPremCurrencyRow.amount += amount;

        if (needsInsert) {
          allPromises.push(tx('user_premium_currency').where('user_id', userId).first('amount').insert(_chainState.userPremCurrencyRow));
        } else {
          allPromises.push(tx('user_premium_currency').where('user_id', userId).first('amount').update({
            amount: _chainState.userPremCurrencyRow.amount,
          }),
          );
        }

        return Promise.all(allPromises);
      })).bind(this_obj)
      .then(function () {
        return _chainState.userPremCurrencyRow;
      });

    return trxPromise;
  }

  // Amount is negative value
  static debitUserPremiumCurrency(txPromise, tx, userId, amount) {
    const _chainState: Record<string, any> = {};
    // userId must be defined
    if ((userId == null)) {
      return Promise.reject(new Error(`debitUserPremiumCurrency: invalid user ID - ${userId}`));
    }

    amount = parseInt(amount);
    if ((amount == null) || (amount >= 0) || _.isNaN(amount)) {
      return Promise.reject(new Error(`debitUserPremiumCurrency: invalid amount - ${amount}`));
    }

    const this_obj = {};

    const trxPromise = knex.transaction((tx) => tx('users').where('id', userId).first('id').forUpdate()
      .bind(this_obj)
      .then(function (userRow) {
        _chainState.userRow = userRow;

        return tx('user_premium_currency').where('user_id', userId).first('amount');
      })
      .then(function (userPremCurrencyRow) {
        const allPromises = [];

        if ((userPremCurrencyRow == null)) {
          throw new Errors.InsufficientFundsError('Insufficient currency to debit');
        }

        _chainState.userPremCurrencyRow = userPremCurrencyRow;
        if (_chainState.userPremCurrencyRow.amount == null) { _chainState.userPremCurrencyRow.amount = 0; }

        if (_chainState.userPremCurrencyRow.amount < amount) {
          throw new Errors.InsufficientFundsError('Insufficient currency to debit');
        }

        _chainState.userPremCurrencyRow.amount += amount;

        allPromises.push(tx('user_premium_currency').where('user_id', userId).first('amount').update({
          amount: _chainState.userPremCurrencyRow.amount,
        }),
        );

        // txPromise,tx,userRow,userId,sku,price,currencyCode,chargeId,chargeJson,paymentType,createdAt
        return Promise.all(allPromises);
      })).bind(this_obj)
      .then(function () {
        return _chainState.purchaseId;
      });
    return trxPromise;
  }
}

module.exports = ShopModule;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
