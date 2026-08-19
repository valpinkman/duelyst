/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const express = require('express');
const util = require('util');
const knex = require('../../../lib/data_access/knex');
const ChallengesModule = require('../../../lib/data_access/challenges');
const DataAccessHelpers = require('../../../lib/data_access/helpers');
const Logger = require('../../../../app/common/logger');
const t = require('tcomb-validation');
const moment = require('moment');
const Errors = require('../../../lib/custom_errors');

const router = express.Router();

router.get('/gated', function (req, res, next) {
  const user_id = req.user.d.id;

  return knex('user_challenges').where('user_id', user_id).select()
    .then(function (challengeRows) {
      challengeRows = DataAccessHelpers.restifyData(challengeRows);
      return res.status(200).json(challengeRows);
    })
    .catch((error) => next(error));
});

router.get('/gated/:challenge_type', function (req, res, next) {
  const result = t.validate(req.params.challenge_type, t.Str);
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const user_id = req.user.d.id;
  const challenge_type = result.value;

  return knex('user_challenges').where({ user_id: user_id, challenge_id: challenge_type }).select()
    .then((challengeRow) => res.status(200).json(challengeRow))
    .catch((error) => next(error));
});

router.put('/gated/:challenge_type/last_attempted_at', function (req, res, next) {
  const result = t.validate(req.params.challenge_type, t.Str);
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const user_id = req.user.d.id;
  const challenge_type = result.value;

  return ChallengesModule.markChallengeAsAttempted(user_id, challenge_type)
    .then((value) => res.status(200).json(value)).catch(function (error) {
      Logger.module('API').error(`Failed to set challenge ${challenge_type} as attempted for ${user_id.blue}`.red + ' ERROR: ' + util.inspect(error));
      return next(error);
    });
});

router.put('/gated/:challenge_type/completed_at', function (req, res, next) {
  // validate challenge type
  const result = t.validate(req.params.challenge_type, t.Str);
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  // validate process quest request param
  let process_quests = t.validate(req.body.process_quests, t.maybe(t.Boolean));
  if (!process_quests.isValid()) {
    return res.status(400).json(process_quests.errors);
  }

  const user_id = req.user.d.id;
  const challenge_type = result.value;
  process_quests = process_quests.value;

  return ChallengesModule.completeChallengeWithType(user_id, challenge_type, process_quests)
    .then(function (challengeResult) {
      if (challengeResult) {
      // First challenge completion
        return res.status(200).json(challengeResult);
      } else {
      // Challenge was already completed
        return res.status(304).json({});
      }
    }).catch(function (error) {
      Logger.module('API').error(`Failed to set challenge ${challenge_type} as completed for ${user_id.blue}`.red + ' ERROR: ' + util.inspect(error));
      return next(error);
    });
});

router.get('/daily/completed_at', function (req, res, next) {
  const user_id = req.user.d.id;

  return knex('users').where('id', user_id).first('daily_challenge_last_completed_at')
    .then(function (userRow) {
      let lastCompletedData = {
        daily_challenge_last_completed_at: userRow.daily_challenge_last_completed_at,
      };
      lastCompletedData = DataAccessHelpers.restifyData(lastCompletedData);
      return res.status(200).json(lastCompletedData);
    })
    .catch((error) => next(error));
});

router.put('/daily/:challenge_id/completed_at', function (req, res, next) {
  // validate challenge type
  const result = t.validate(req.params.challenge_id, t.Str);
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const result2 = t.validate(req.body.completed_at, t.Number);
  if (!result2.isValid()) {
    return res.status(400).json(result2.errors);
  }

  const user_id = req.user.d.id;
  const challenge_id = result.value;
  const completed_at = result2.value;

  return ChallengesModule.markDailyChallengeAsCompleted(user_id, challenge_id, null, moment.utc(completed_at))
    .then(function (challengeResult) {
      if (challengeResult) {
      // First challenge completion
        return res.status(200).json(challengeResult);
      } else {
      // Challenge was already completed
        return res.status(304).json({});
      }
    }).catch(Errors.AlreadyExistsError, function (error) {
      Logger.module('API').error(`Challenge ID ${challenge_id} already completed for user ID ${user_id.blue}`);
      return res.status(304).json({});
    }).catch(Errors.DailyChallengeTimeFrameError, function (error) {
      Logger.module('API').error(`Daily challenge completed_at ${completed_at} outside allowable time frame for user ID ${user_id.blue}`);
      return res.status(400).json({ message: 'Daily challenge completion outside allowable time frame. Local clock may be skewed.' });
    })
    .catch(function (error) {
      Logger.module('API').error(`Failed to set challenge ${challenge_id} as completed for ${user_id.blue}`.red + ' ERROR: ' + util.inspect(error));
      return next(error);
    });
});

module.exports = router;
