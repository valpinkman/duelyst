/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const express = require('express');
const UsersModule = require('../../../lib/data_access/users');
const knex = require('../../../lib/data_access/knex');
const DataAccessHelpers = require('../../../lib/data_access/helpers');
const Logger = require('../../../../app/common/logger');
const t = require('tcomb-validation');
const moment = require('moment');
const _ = require('underscore');

const router = express.Router();

router.get('/twitch_rewards/unread', function (req, res, next) {
  const user_id = req.user.d.id;

  return knex('user_twitch_rewards').where({ user_id: user_id })
    .then(function (rewardRows) {
      rewardRows = _.filter(rewardRows, (row) => row.claimed_at === null);
      if (rewardRows != null) {
        return res.status(200).json(DataAccessHelpers.restifyData(rewardRows));
      } else {
        return res.status(404).end();
      }
    }).catch((error) => next(error));
});

router.put('/twitch_rewards/:twitch_reward_id', function (req, res, next) {
  let user_id = req.user.d.id;

  const result = t.validate(req.params.twitch_reward_id, t.subtype(t.Str, (s) => s.length <= 36));
  if (!result.isValid()) {
    return next();
  }

  user_id = req.user.d.id;
  const twitch_reward_id = result.value;

  return knex('user_twitch_rewards').where({ twitch_reward_id: twitch_reward_id, user_id: user_id }).update({
    claimed_at: moment.utc().toDate(),
  })
    .then(function (value) {
      if (value) {
        return res.status(200).json({});
      } else {
        return res.status(404).end();
      }
    })
    .catch((error) => next(error));
});

router.get('/:reward_id', function (req, res, next) {
  const result = t.validate(req.params.reward_id, t.subtype(t.Str, (s) => s.length <= 36));
  if (!result.isValid()) {
    return next();
  }

  const user_id = req.user.d.id;
  const reward_id = result.value;

  return knex('user_rewards').where({ id: reward_id, user_id: user_id }).first()
    .then(function (rewardRow) {
      if (rewardRow) {
        return res.status(200).json(DataAccessHelpers.restifyData(rewardRow));
      } else {
        return res.status(404).end();
      }
    })
    .catch((error) => next(error));
});

router.put('/:reward_id/read_at', function (req, res, next) {
  const result = t.validate(req.params.reward_id, t.subtype(t.Str, (s) => s.length <= 36));
  if (!result.isValid()) {
    return next();
  }

  const user_id = req.user.d.id;
  const reward_id = result.value;

  return knex('user_rewards').where({ id: reward_id, user_id: user_id }).update({
    is_unread: false,
  })
    .then(function (value) {
      if (value) {
        return res.status(200).json({});
      } else {
        return res.status(404).end();
      }
    })
    .catch((error) => next(error));
});

module.exports = router;
