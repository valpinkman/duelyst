/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const express = require('express');
const knex = require('../../../lib/data_access/knex');
const DataAccessHelpers = require('../../../lib/data_access/helpers');
const Logger = require('@duelyst/common/logger');
const t = require('tcomb-validation');

const router = express.Router();

router.get('/', function (req, res, next) {
  const user_id = req.user.d.id;

  return knex('user_faction_progression')
    .where('user_id', user_id)
    .select()
    .then(function (progressionRows) {
      progressionRows = DataAccessHelpers.restifyData(progressionRows);
      const responseData = {};
      for (var row of Array.from<any>(progressionRows)) {
        responseData[row.faction_id] = row;
      }
      return res.status(200).json(responseData);
    })
    .catch((error) => next(error));
});

router.get('/:faction_id', function (req, res, next) {
  const result = t.validate(parseInt(req.params.faction_id, 10), t.Number);
  if (!result.isValid()) {
    return next();
  }

  const user_id = req.user.d.id;
  const faction_id = result.value;

  return knex('user_faction_progression')
    .where('user_id', user_id)
    .andWhere('faction_id', faction_id)
    .first()
    .then(function (row) {
      row = DataAccessHelpers.restifyData(row);
      return res.status(200).json(row);
    })
    .catch((error) => next(error));
});

module.exports = router;
