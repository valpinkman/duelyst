/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const express = require('express');
const util = require('util');
const RiftModule = require('../../../lib/data_access/rift');
const DataAccessHelpers = require('../../../lib/data_access/helpers');
const Logger = require('../../../../app/common/logger');
const Errors = require('../../../lib/custom_errors');
const t = require('tcomb-validation');
const knex = require('../../../lib/data_access/knex');
const _ = require('underscore');
const PromiseUtils = require('../../../../app/common/utils/utils_promise');

const router = express.Router();

// Summary data
router.get('/', function (req, res, next) {
  const user_id = req.user.d.id;

  const pruneRiftRunData = (riftRunData) => ({
    user_id: riftRunData.user_id,
    ticket_id: riftRunData.ticket_id,
    win_count: riftRunData.win_count,
    loss_count: riftRunData.loss_count,
    draw_count: riftRunData.draw_count,
    rift_level: riftRunData.rift_level,
    rift_points: riftRunData.rift_points,
    started_at: riftRunData.started_at,
    faction_id: riftRunData.faction_id,
    general_id: riftRunData.general_id,
    deck: riftRunData.deck,
    rift_rating: riftRunData.rift_rating,
  });

  return knex('user_rift_runs')
    .where('user_id', user_id)
    .andWhere('win_count', '>', 0)
    .orderBy('rift_rating', 'desc')
    .first()
    .then(function (highestRatingRiftRunRow) {
      const responseData: Record<string, any> = {};

      if (highestRatingRiftRunRow != null) {
        highestRatingRiftRunRow = DataAccessHelpers.restifyData(highestRatingRiftRunRow);
        responseData.highest_rated_run = pruneRiftRunData(highestRatingRiftRunRow);
      } else {
        responseData.highest_rated_run = {};
      }

      return res.status(200).json(responseData);
    })
    .catch((error) => next(error));
});

router.get('/runs', function (req, res, next) {
  const user_id = req.user.d.id;

  return knex('user_rift_runs')
    .where('user_id', user_id)
    .orderBy('created_at', 'desc')
    .select()
    .then((rows) =>
      PromiseUtils.map(rows, (riftRunRow) => RiftModule.sanitizeRunCardChoicesIfNeeded(riftRunRow)),
    )
    .then(function (rows) {
      const playerFacingRows = _.map(rows, function (row) {
        row = _.omit(row, ['rating', 'rating_delta', 'is_bot_game']);
        return row;
      });
      return res.status(200).json(DataAccessHelpers.restifyData(playerFacingRows));
    })
    .catch((error) => next(error));
});

router.post('/runs', function (req, res, next) {
  const result = t.validate(
    req.body.ticket_id,
    t.subtype(t.Str, (s) => s.length <= 36),
  );
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const user_id = req.user.d.id;
  const ticket_id = result.value;

  return RiftModule.startRun(user_id, ticket_id)
    .then(function (data) {
      Logger.module('API').log(`Rift run STARTED for user ${user_id.blue}`.cyan);
      return res.status(200).json(DataAccessHelpers.restifyData(data));
    })
    .catch(function (error) {
      Logger.module('API').log(
        `ERROR starting rift run for user ${user_id.blue}`.red,
        util.inspect(error),
      );
      return next(error);
    });
});

router.post('/runs/free', function (req, res, next) {
  const user_id = req.user.d.id;

  return RiftModule.claimFirstFreeRiftTicket(user_id)
    .then((ticketId) => RiftModule.startRun(user_id, ticketId))
    .then(function (data) {
      Logger.module('API').log(`Free Rift run STARTED for user ${user_id.blue}`.cyan);
      return res.status(200).json(DataAccessHelpers.restifyData(data));
    })
    .catch(function (error) {
      Logger.module('API').log(
        `ERROR starting free rift run for user ${user_id.blue}`.red,
        util.inspect(error),
      );
      return next(error);
    });
});

router.put('/runs/:ticket_id/general_id', function (req, res, next) {
  const result = t.validate(req.body.general_id, t.Number);
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const user_id = req.user.d.id;
  const general_id = result.value;
  const { ticket_id } = req.params;

  return RiftModule.chooseGeneral(user_id, ticket_id, general_id)
    .then(function (data) {
      Logger.module('API').log(
        `Rift general ${general_id} selected for user ${user_id.blue} ticket ${ticket_id}`.cyan,
      );
      return res.status(200).json(data);
    })
    .catch(function (error) {
      Logger.module('API').log(
        `ERROR choosing rift general for user ${user_id.blue} ticket ${ticket_id}`.red,
        util.inspect(error),
      );
      return next(error);
    });
});

router.post('/runs/:ticket_id/card_id_to_upgrade', function (req, res, next) {
  const result = t.validate(req.body.card_id, t.Number);
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const user_id = req.user.d.id;
  const { ticket_id } = req.params;
  const card_id = result.value;

  return RiftModule.chooseCardToUpgrade(user_id, ticket_id, card_id)
    .then(function (data) {
      Logger.module('API').log(
        `Rift card ${card_id} selected for upgrade for user ${user_id.blue} ticket ${ticket_id}`
          .cyan,
      );
      return res.status(200).json(DataAccessHelpers.restifyData(data));
    })
    .catch(function (error) {
      Logger.module('API').log(
        `ERROR choosing rift card to upgrade for user ${user_id.blue} ticket ${ticket_id}`.red,
        util.inspect(error),
      );
      return next(error);
    });
});

router.post('/runs/:ticket_id/upgrade', function (req, res, next) {
  const result = t.validate(req.body.card_id, t.Number);
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const user_id = req.user.d.id;
  const { ticket_id } = req.params;
  const card_id = result.value;

  return RiftModule.upgradeCard(user_id, ticket_id, card_id)
    .then(function (data) {
      Logger.module('API').log(
        `Rift card upgraded to ${card_id} for user ${user_id.blue} ticket ${ticket_id}`.cyan,
      );
      return res.status(200).json(DataAccessHelpers.restifyData(data));
    })
    .catch(function (error) {
      Logger.module('API').log(
        `ERROR upgrading rift card for user ${user_id.blue} ticket ${ticket_id}`.red,
        util.inspect(error),
      );
      return next(error);
    });
});

router.post('/runs/:ticket_id/store_upgrade', function (req, res, next) {
  const user_id = req.user.d.id;
  const { ticket_id } = req.params;

  return RiftModule.storeCurrentUpgrade(user_id, ticket_id)
    .then(function (data) {
      Logger.module('API').log(
        `Rift upgrade stored for user ${user_id.blue} ticket ${ticket_id}`.cyan,
      );
      return res.status(200).json(DataAccessHelpers.restifyData(data));
    })
    .catch(function (error) {
      Logger.module('API').log(
        `ERROR storing upgrade pack for user ${user_id.blue} ticket ${ticket_id}`.red,
        util.inspect(error),
      );
      return next(error);
    });
});

router.post('/runs/:ticket_id/reroll_upgrade', function (req, res, next) {
  const user_id = req.user.d.id;
  const { ticket_id } = req.params;

  return RiftModule.rerollCurrentUpgrade(user_id, ticket_id)
    .then(function (data) {
      Logger.module('API').log(
        `Rift upgrade rerolled for user ${user_id.blue} ticket ${ticket_id}`.cyan,
      );
      return res.status(200).json(DataAccessHelpers.restifyData(data));
    })
    .catch(function (error) {
      Logger.module('API').log(
        `ERROR rerolling upgrade pack for user ${user_id.blue} ticket ${ticket_id}`.red,
        util.inspect(error),
      );
      return next(error);
    });
});

module.exports = router;
