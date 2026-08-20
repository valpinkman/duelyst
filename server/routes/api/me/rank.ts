/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const express = require('express');
const moment = require('moment');
const util = require('util');
const RankModule = require('../../../lib/data_access/rank');
const knex = require('../../../lib/data_access/knex');
const DataAccessHelpers = require('../../../lib/data_access/helpers');
const Logger = require('../../../../app/common/logger');
const Errors = require('../../../lib/custom_errors');
const RankFactory = require('../../../../app/sdk/rank/rankFactory');
const RankDivisionLookup = require('../../../../app/sdk/rank/rankDivisionLookup');
const t = require('tcomb-validation');
const types = require('../../../validators/types');
const { SRankManager } = require('../../../redis');
const { onType } = require('../../../../app/common/utils/utils_promise');

const router = express.Router();

/*
 * There was a `GET /` here. It has been removed rather than repaired, because
 * it could never have worked and nothing called it:
 *
 *   - it queried `user_rank`, a table NO MIGRATION CREATES (the schema has
 *     user_rank_history, user_rank_events and user_rank_ratings), so every
 *     request 500'd;
 *   - it did `var challengeRows = DataAccessHelpers.restifyData(challengeRows)`
 *     -- passing the variable to its own initializer, i.e. undefined;
 *   - it then discarded that value and returned the raw rows anyway;
 *   - and the variable names (questRows/challengeRows) show it was copy-pasted
 *     from another route.
 *
 * The client only ever POSTs to /api/me/rank and GETs the sub-routes below.
 * Reconstructing what it "meant" to return would be inventing a feature, so
 * this is deletion, not a fix. Restore from history if a current-rank endpoint
 * is ever wanted.
 */

router.post('/', function (req, res, next) {
  const user_id = req.user.d.id;

  Logger.module('API').debug(`Cycling (if needed) ranking for user ${user_id.blue}`.magenta);

  return RankModule.userNeedsSeasonStartRanking(user_id)
    .then(function (value) {
      // check if we need to update rank
      if (!value) {
        Logger.module('API').debug(`RANKING does not need to be cycled for ${user_id.blue}`);
        return res.status(304).json({});
      } else {
        Logger.module('API').debug(`Cycling SEASON RANKING for ${user_id.blue}`.magenta);
        return RankModule.cycleUserSeasonRanking(user_id)
          .then(function (value) {
            // all good, send the rank over
            Logger.module('API').debug(`SEASON RANKING cycled for ${user_id.blue}`.cyan);
            return res.status(200).json(value);
          })
          .catch(function (error) {
            // oops, looks like we have an error
            Logger.module('API').debug(
              `SEASON RANKING failed to cycle for ${user_id.blue}`.red +
                ' ERROR: ' +
                util.inspect(error),
            );
            return next(error);
          });
      }
    })
    .catch(function (error) {
      Logger.module('API').debug(
        `Failed to detect if we need a new SEASON RANKING for ${user_id.blue}`.red +
          ' ERROR: ' +
          util.inspect(error),
      );
      return next(error);
    });
});

router.get('/history', function (req, res, next) {
  const user_id = req.user.d.id;

  return knex('user_rank_history')
    .where('user_id', user_id)
    .orderBy('starting_at', 'desc')
    .limit(12)
    .select()
    .then((rankHistoryRows) => res.status(200).json(DataAccessHelpers.restifyData(rankHistoryRows)))
    .catch((error) => next(error));
});

router.get('/history/game_counters', function (req, res, next) {
  const user_id = req.user.d.id;

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
  const user_id = req.user.d.id;
  const season_starting_at = moment(req.params.season_key + ' +0000', 'YYYY-MM Z').utc();

  if (!season_starting_at.valueOf() > 0) {
    res.status(400).json({});
    return;
  }

  return knex('user_game_season_counters')
    .where('user_id', user_id)
    .andWhere('game_type', 'ranked')
    .andWhere('season_starting_at', season_starting_at.toDate())
    .first()
    .then(function (rankHistoryRow) {
      if (rankHistoryRow != null) {
        return res.status(200).json(DataAccessHelpers.restifyData(rankHistoryRow));
      } else {
        return res.status(200).json({});
      }
    })
    .catch((error) => next(error));
});

router.get('/top', function (req, res, next) {
  const user_id = req.user.d.id;

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
  const user_id = req.user.d.id;

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

router.get('/current_ladder_position', function (req, res, next) {
  const user_id = req.user.d.id;

  const MOMENT_UTC_NOW = moment().utc();
  const startOfSeasonMonth = moment(MOMENT_UTC_NOW).utc().startOf('month');

  return SRankManager.getUserLadderPosition(user_id, startOfSeasonMonth)
    .then((userLadderPosition) => Promise.resolve({ ladder_position: userLadderPosition }))
    .then((ladderData) => res.status(200).json(ladderData))
    .catch((error) => next(error));
});

//  knex("user_rank_ratings").first("ladder_position").where('user_id',user_id).andWhere("season_starting_at",seasonStartingAt)
//  .then (rankRow) ->
//    rankRow = rankRow || {}
//    rankRow = DataAccessHelpers.restifyData(rankRow)
//    res.status(200).json(rankRow)
//  .catch (error) -> next(error)

router.put('/history/:season_key/claim_rewards', function (req, res, next) {
  const result = t.validate(req.params.season_key, types.SeasonKey);
  if (!result.isValid()) {
    return next();
  }

  const user_id = req.user.d.id;
  const season_key = result.value;
  const season_starting_at = moment(season_key + ' +0000', 'YYYY-MM Z');

  return RankModule.claimRewardsForSeasonRank(user_id, season_starting_at)
    .then(function (data) {
      Logger.module('API').debug(
        `Season ${season_key} rewards claimed for user ${user_id.blue}`.cyan,
      );
      return res.status(200).json(data);
    })
    .catch(
      onType(Errors.AlreadyExistsError, function (error) {
        Logger.module('API').debug(
          `ERROR: season ${season_key} rewards already claimed by user ${user_id.blue}`.red,
          util.inspect(error),
        );
        return res.status(403).json({
          message: `The rewards for season ${season_key} have already been claimed previously.`,
        });
      }),
    )
    .catch(function (error) {
      Logger.module('API').debug(
        `ERROR claiming season ${season_key} rewards for user ${user_id.blue}`.red,
        util.inspect(error),
      );
      return next(error);
    });
});

module.exports = router;
