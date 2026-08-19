/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const express = require('express');
const moment = require('moment');
const UsersModule = require('../../../lib/data_access/users');
const InventoryModule = require('../../../lib/data_access/inventory');
const ShopModule = require('../../../lib/data_access/shop');
const knex = require('../../../lib/data_access/knex');
const DataAccessHelpers = require('../../../lib/data_access/helpers');
const Logger = require('../../../../app/common/logger');
const Errors = require('../../../lib/custom_errors');
const t = require('tcomb-validation');
const validators = require('../../../validators');

// TODO: replace this with info in database?
const PremiumShopData = require('app/data/premium_shop.json');
const ShopData = require('app/data/shop.json');

const router = express.Router();

router.post('/premium_purchase', function (req, res, next) {
  const result = t.validate(req.body, validators.premiumPurchaseInput);
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const user_id = req.user.d.id;
  const {
    product_sku,
  } = result.value;
  const {
    sale_id,
  } = result.value;

  return ShopModule.purchaseProductWithPremiumCurrency(user_id, product_sku, sale_id)
    .then(function () {
      Logger.module('API').debug(`User ${user_id.blue} purchased ${product_sku}`.cyan);
      return res.status(200).json({});
    }).catch(function (error) {
      Logger.module('API').error(`ERROR Processing Purchase ${product_sku} by ${user_id.blue}`.red);
      if (((error.raw != null ? error.raw.type : undefined) === 'card_error') || ((error.raw != null ? error.raw.type : undefined) === 'invalid_request_error')) {
        Logger.module('API').error(`ERROR is safe to print for user ${user_id.blue}`.red);
        return res.status(500).json({ error: error.message });
      } else {
        return next(error);
      }
    });
});

router.post('/customer', (req, res, next) => res.status(400).send('Payment methods are not supported.'));

router.delete('/customer', (req, res, next) => res.status(400).send('Payment methods are not supported.'));

router.get('/products', (req, res, next) => Promise.resolve(ShopData)
  .then((shopData) => res.status(200).json(shopData)).catch((error) => res.status(500).json({ error: error.message })));

router.get('/premium_pack_products', (req, res, next) => Promise.resolve(PremiumShopData)
  .then((premiumPackData) => res.status(200).json(premiumPackData)).catch((error) => res.status(500).json({ error: error.message })));

// Returns array of all expired shop sales
router.get('/sales', function (req, res, next) {
  Logger.module('API').debug('Retrieving unexpired shop sales'.magenta);

  const MOMENT_NOW_UTC = moment.utc();

  // Retrieves all unexpired sales, returns sales that havent started yet
  return knex('shop_sales').select('sale_id', 'sku', 'sale_price', 'sale_starts_at', 'sale_ends_at').where('sale_ends_at', '>', MOMENT_NOW_UTC.toDate()).andWhere('disabled', '=', false)
    .then((shopSalesRows) => res.status(200).json(shopSalesRows))
    .catch((error) => res.status(500).json({ error: error.message }));
});

module.exports = router;
