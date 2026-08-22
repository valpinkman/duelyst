/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const express = require('express');
const knex = require('../../../lib/data_access/knex');
const DataAccessHelpers = require('../../../lib/data_access/helpers');
const Logger = require('@duelyst/common/logger');
const RankFactory = require('@duelyst/sdk/rank/rankFactory');
const RankDivisionLookup = require('@duelyst/sdk/rank/rankDivisionLookup');
const config = require('@duelyst/config');
const t = require('tcomb-validation');
const types = require('../../../validators/types');
const moment = require('moment');
const { SRankManager } = require('../../../redis');

const router = express.Router();

router.get('/current', function (req, res, next) {
  // user id is set by a middleware
  const { user_id } = req;

  return knex('users')
    .select('rank', 'rank_win_streak', 'rank_starting_at')
    .where('id', user_id)
    .first()
    .then(function (rankRow) {
      rankRow.win_streak = rankRow.rank_win_streak;
      rankRow.starting_at = rankRow.rank_starting_at;
      delete rankRow.rank_win_streak;
      delete rankRow.rank_starting_at;
      rankRow = DataAccessHelpers.restifyData(rankRow);
      return res.status(200).json(rankRow);
    })
    .catch((error) => next(error));
});

router.get('/current_ladder_position', function (req, res, next) {
  const { user_id } = req;

  const MOMENT_UTC_NOW = moment().utc();
  const startOfSeasonMonth = moment(MOMENT_UTC_NOW).utc().startOf('month');

  return SRankManager.getUserLadderPosition(user_id, startOfSeasonMonth)
    .then((userLadderPosition) => Promise.resolve({ ladder_position: userLadderPosition }))
    .then((ladderData) => res.status(200).json(ladderData))
    .catch((error) => next(error));
});

router.get('/history', function (req, res, next) {
  // user id is set by a middleware
  const { user_id } = req;

  return knex('user_rank_history')
    .where('user_id', user_id)
    .orderBy('starting_at', 'desc')
    .limit(12)
    .select()
    .then((rankHistoryRows) => res.status(200).json(DataAccessHelpers.restifyData(rankHistoryRows)))
    .catch((error) => next(error));
});

router.get('/history/game_counters', function (req, res, next) {
  // user id is set by a middleware
  const { user_id } = req;

  return knex('user_game_season_counters')
    .where('user_id', user_id)
    .andWhere('game_type', 'ranked')
    .orderBy('season_starting_at', 'desc')
    .limit(12)
    .select()
    .then((rankHistoryRows) => res.status(200).json(DataAccessHelpers.restifyData(rankHistoryRows)))
    .catch((error) => next(error));
});

router.get('/history/:season_key/game_counter', function (req, res, next) {
  const result = t.validate(req.params.season_key, types.SeasonKey);
  if (!result.isValid()) {
    return next();
  }

  // user id is set by a middleware
  const { user_id } = req;
  const season_key = result.value;
  const season_starting_at = moment(season_key + ' +0000', 'YYYY-MM Z').utc();

  // `!x > 0` is exactly `!x` (a boolean compared to 0), and it is what
  // CoffeeScript itself emitted for `not x > 0` -- `not` binds tighter than
  // `>` there too, so this is the original behaviour, not a mistranslation.
  // Simplified to the equivalent form; do NOT "correct" it to !(x > 0),
  // which differs for negative values.
  if (!season_starting_at.valueOf()) {
    return res.status(400).json({});
  }

  return knex('user_game_season_counters')
    .where('user_id', user_id)
    .andWhere('game_type', 'ranked')
    .andWhere('season_starting_at', season_starting_at.toDate())
    .first()
    .then(function (rankHistoryRow) {
      if (rankHistoryRow == null) {
        // use empty default when no season counters exist
        // this can happen on new accounts that haven't played any games yet
        rankHistoryRow = {};
      }
      return res.status(200).json(DataAccessHelpers.restifyData(rankHistoryRow));
    })
    .catch((error) => next(error));
});

router.get('/top', function (req, res, next) {
  // user id is set by a middleware
  const { user_id } = req;

  return knex('users')
    .where('id', user_id)
    .first('top_rank', 'top_rank_starting_at', 'top_rank_ladder_position')
    .then(function (rankRow) {
      rankRow = DataAccessHelpers.restifyData(rankRow);
      return res.status(200).json(rankRow);
    })
    .catch((error) => next(error));
});

router.get('/division_stats', function (req, res, next) {
  // user id is set by a middleware
  const { user_id } = req;

  return knex('user_rank_history')
    .where('user_id', user_id)
    .select()
    .then(function (rankHistoryRows) {
      const stats = {};
      for (var rankKey in RankDivisionLookup) {
        var rankValue = RankDivisionLookup[rankKey];
        stats[rankKey] = { count: 0 };
      }
      for (var row of Array.from<any>(rankHistoryRows)) {
        var divisionKey = RankFactory.rankedDivisionKeyForRank(row.rank);
        stats[divisionKey].count += 1;
      }
      return res.status(200).json(stats);
    })
    .catch((error) => next(error));
});

module.exports = router;
