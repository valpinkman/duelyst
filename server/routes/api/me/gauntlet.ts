/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const express = require('express');
const util = require('util');
const moment = require('moment');
const Promise = require('bluebird');
const _ = require('underscore');
const GauntletModule = require('../../../lib/data_access/gauntlet');
const knex = require('../../../lib/data_access/knex');
const Logger = require('../../../../app/common/logger');
const Errors = require('../../../lib/custom_errors');
const CONFIG = require('../../../../app/common/config');
const DataAccessHelpers = require('../../../lib/data_access/helpers');
const t = require('tcomb-validation');

const router = express.Router();

router.post('/', function (req, res, next) {
  const result = t.validate(req.body.ticket_id, t.subtype(t.Str, (s) => s.length <= 36));
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const user_id = req.user.d.id;
  const ticket_id = result.value;

  return GauntletModule.startRun(user_id, ticket_id)
    .then(function (data) {
      Logger.module('API').debug(`Arena run STARTED for user ${user_id.blue}`.cyan);
      return res.status(200).json(data);
    }).catch(function (error) {
      Logger.module('API').error(`ERROR starting arena run for user ${user_id.blue}`.red, util.inspect(error));
      return next(error);
    });
});

router.delete('/current', function (req, res, next) {
  const user_id = req.user.d.id;

  return GauntletModule.resignRun(user_id)
    .then(function (data) {
      Logger.module('API').debug(`Arena run RESIGNED by user ${user_id.blue}`.cyan);
      return res.status(200).json(data);
    }).catch(function (error) {
      Logger.module('API').error(`ERROR resigning arena run for user ${user_id.blue}`.red, util.inspect(error));
      return next(error);
    });
});

router.put('/current/faction_id', function (req, res, next) {
  const result = t.validate(req.body.faction_id, t.Number);
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const user_id = req.user.d.id;
  const faction_id = result.value;

  return GauntletModule.chooseFaction(user_id, faction_id)
    .then(function (data) {
      Logger.module('API').debug(`Arena faction ${faction_id} selected for user ${user_id.blue}`.cyan);
      return res.status(200).json(data);
    }).catch(function (error) {
      Logger.module('API').error(`ERROR choosing arena faction for user ${user_id.blue}`.red, util.inspect(error));
      return next(error);
    });
});

router.post('/current/cards', function (req, res, next) {
  const result = t.validate(req.body.card_id, t.Number);
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const user_id = req.user.d.id;
  const card_id = result.value;

  return GauntletModule.chooseCard(user_id, card_id)
    .then(function (data) {
      Logger.module('API').debug(`Arena card ${card_id} selected for user ${user_id.blue}`.cyan);
      return res.status(200).json(data);
    }).catch(function (error) {
      Logger.module('API').error(`ERROR choosing arena card for user ${user_id.blue}`.red, util.inspect(error));
      return next(error);
    });
});

router.put('/current/rewards_claimed_at', function (req, res, next) {
  const user_id = req.user.d.id;

  return GauntletModule.claimRewards(user_id)
    .then(function (data) {
      Logger.module('API').debug(`Arena rewards claimed for user ${user_id.blue}`.cyan);
      return res.status(200).json(data);
    }).catch(Errors.ArenaRewardsAlreadyClaimedError, function (error) {
      Logger.module('API').error(`ERROR: arena rewards already claimed for user ${user_id.blue}`.red, util.inspect(error));
      return res.status(403).json({ message: 'The rewards for this run have already been claimed previously.' });
    }).catch(function (error) {
      Logger.module('API').error(`ERROR claiming arena rewards for user ${user_id.blue}`.red, util.inspect(error));
      return next(error);
    });
});

router.get('/decks', function (req, res, next) {
  const user_id = req.user.d.id;

  const currentGauntletDeckPromise = knex('user_gauntlet_run').first().where('user_id', user_id);

  const decksExpireMoment = moment.utc().subtract(CONFIG.DAYS_BEFORE_GAUNTLET_DECK_EXPIRES, 'days');
  const recentGauntletDecksPromise = knex('user_gauntlet_run_complete').select().where('user_id', user_id).andWhere('ended_at', '>', decksExpireMoment.toDate())
    .orderBy('ended_at', 'desc');

  return Promise.all([currentGauntletDeckPromise, recentGauntletDecksPromise])
    .spread(function (currentRunRow, recentRunRows) {
      const runs = [];
      _.each(recentRunRows, function (recentRun) {
        if (recentRun.is_complete) {
          return runs.push(recentRun);
        }
      });
      if ((currentRunRow != null) && currentRunRow.is_complete) {
        runs.unshift(currentRunRow);
      }

      return res.status(200).json(DataAccessHelpers.restifyData(runs));
    }).catch(function (error) {
      Logger.module('API').error(`ERROR getting gauntlet decks for user ${user_id.blue}`.red, util.inspect(error));
      return next(error);
    });
});

module.exports = router;
