/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const express = require('express');
const moment = require('moment');
const knex = require('../../../lib/data_access/knex');
const DataAccessHelpers = require('../../../lib/data_access/helpers');
const ReferralsModule = require('../../../lib/data_access/referrals');
const Errors = require('../../../lib/custom_errors');
const Logger = require('../../../../app/common/logger');
const { onType } = require('../../../../app/common/utils/utils_promise');

const router = express.Router();

router.get('/summary', function (req, res, next) {
  const user_id = req.user.d.id;

  return knex('users').where('id', user_id).first('referral_rewards_claimed_at')
    .then(function (userRow) {
      if (userRow.referral_rewards_claimed_at == null) { userRow.referral_rewards_claimed_at = moment.utc(0).toDate(); }
      return Promise.all([
        knex('user_referrals').where('user_id', user_id).select(),
        knex('user_referral_events').where('referrer_id', user_id).andWhere('created_at', '>', userRow.referral_rewards_claimed_at).select(),
      ]);
    })
    .then(function ([referralRows, unreadEventRows]) {
      let row;
      Logger.module('API').debug('referralRows', referralRows);
      Logger.module('API').debug('unreadEventRows', unreadEventRows);

      referralRows = DataAccessHelpers.restifyData(referralRows) || [];
      unreadEventRows = DataAccessHelpers.restifyData(unreadEventRows) || [];

      const stats: Record<string, any> = {};

      for (row of Array.from<any>(referralRows)) {
        if (stats.signups == null) { stats.signups = 0; }
        stats.signups++;
        if (row.level_reached > 0) {
          if (stats.silver == null) { stats.silver = 0; }
          stats.silver++;
        }
        if (row.level_reached > 1) {
          if (stats.gold == null) { stats.gold = 0; }
          stats.gold++;
        }
      }

      const unclaimedRewards: Record<string, any> = {};

      for (row of Array.from<any>(unreadEventRows)) {
        switch (row.event_type) {
        case 'silver':
          if (unclaimedRewards.spirit_orbs == null) { unclaimedRewards.spirit_orbs = 0; }
          unclaimedRewards.spirit_orbs += 1;
          break;
        case 'gold':
          if (unclaimedRewards.gold == null) { unclaimedRewards.gold = 0; }
          unclaimedRewards.gold += 200;
          break;
        }
      }
      // when "purchase"
      //   unclaimedRewards.gold ?= 0
      //   unclaimedRewards.gold += 10

      return res.status(200).json({
        stats,
        unclaimed_rewards: unclaimedRewards,
      });
    })
    .catch((error) => next(error));
});

router.get('/', function (req, res, next) {
  const user_id = req.user.d.id;

  return knex('user_referrals')
    .select('user_referrals.*', 'username')
    .where('user_id', user_id)
    .leftJoin('users', 'users.id', 'user_referrals.referred_user_id')
    .then(function (rows) {
      rows = DataAccessHelpers.restifyData(rows);
      return res.status(200).json(rows);
    })
    .catch((error) => next(error));
});

router.get('/events/recent', function (req, res, next) {
  const user_id = req.user.d.id;

  return knex('user_referral_events')
    .select('username', 'event_type', 'user_referral_events.created_at')
    .where('user_referral_events.referrer_id', user_id)
    .orderBy('user_referral_events.created_at', 'desc')
    .leftJoin('users', 'users.id', 'user_referral_events.referred_user_id')
    .limit(20)
    .then(function (rows) {
      rows = DataAccessHelpers.restifyData(rows);
      return res.status(200).json(rows);
    })
    .catch((error) => next(error));
});

router.get('/events/unread', function (req, res, next) {
  const user_id = req.user.d.id;

  return knex('users').where('id', user_id).first('referral_rewards_claimed_at')
    .then((userRow) => knex('user_referral_events').where('referrer_id', user_id).andWhere('created_at', '>', userRow.referral_rewards_claimed_at).select())
    .then(function (rows) {
      rows = DataAccessHelpers.restifyData(rows);
      return res.status(200).json(rows);
    })
    .catch((error) => next(error));
});

router.post('/rewards/claim', function (req, res, next) {
  const user_id = req.user.d.id;

  return ReferralsModule.claimReferralRewards(user_id)
    .then((rewards) => res.status(200).json(rewards)).catch(onType(Errors.BadRequestError, (error) => res.status(304).json({}))).catch((error) => next(error));
});

module.exports = router;
