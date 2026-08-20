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

const router = express.Router();

// Summary data
router.get('/', function (req, res, next) {
  const { user_id } = req;

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
    rift_rating: riftRunData.rift_rating,
  });

  return knex('user_rift_runs')
    .where('user_id', user_id)
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

module.exports = router;
