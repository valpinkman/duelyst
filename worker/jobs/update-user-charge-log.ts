/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/*
Job - Update a users charge log with data sent in wallet_update
*/
const config = require('../../config/config.js');
const ShopModule = require('../../server/lib/data_access/shop');
const Logger = require('../../app/common/logger');
const generatePushId = require('../../app/common/generate_push_id');
const moment = require('moment');
const knex = require('server/lib/data_access/knex');

/**
 * Job - 'update-user-charge-log'
 * @param  {Object} job    Kue job
 * @param  {Function} done   Callback when job is complete
 */
module.exports = function (job, done) {
  const userId = job.data.userId || null;
  const fullfillmentData = job.data.fullfillmentData || null;

  if (!userId) {
    return done(new Error('update-user-charge-log: User ID is not defined.'));
  }

  if (!fullfillmentData) {
    return done(new Error('update-user-charge-log: fulfillment is not defined.'));
  }

  Logger.module('JOB').debug(`[J:${job.id}] Update User ${userId} Charge Log`);

  const this_obj: Record<string, any> = {};

  this_obj.currencyAmount = fullfillmentData.currency_amount;
  this_obj.totalPlatinumAmount = fullfillmentData.total_platinum_amount;
  if ((this_obj.currencyAmount == null)) {
    return Promise.reject(new Error(`update-user-charge-log: Invalid currency amount ${this_obj.currencyAmount} for userId ${userId}`));
  }
  if ((this_obj.totalPlatinumAmount == null)) {
    return Promise.reject(new Error(`update-user-charge-log: Invalid platinum amount ${this_obj.totalPlatinumAmount} for userId ${userId}`));
  }

  this_obj.fullfillmentPrice = Math.floor(100 * (this_obj.currencyAmount || 0));

  var txPromise = knex.transaction((tx) => tx('users').where('id', userId).first().forUpdate()
    .then(function (userRow) {
      const sku = 'diamond_' + this_obj.totalPlatinumAmount;
      return ShopModule._addChargeToUser(txPromise, tx, userRow, userId, sku, this_obj.fullfillmentPrice, 'usd', generatePushId(), fullfillmentData, 'unknown', moment.utc());
    }));

  return txPromise
    .then(function () {
      Logger.module('JOB').debug(`[J:${job.id}] Update User ${userId} Charge Log done()`);
      return done();
    }).catch((error) => done(error));
};
