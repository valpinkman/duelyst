/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const express = require('express');
const knex = require('../../../lib/data_access/knex');
const DataAccessHelpers = require('../../../lib/data_access/helpers');
const Logger = require('../../../../app/common/logger');

const router = express.Router();

router.get('/', function (req, res, next) {
  // user id is set by a middleware
  const { user_id } = req;

  return knex('user_ribbons')
    .where('user_id', user_id)
    .select()
    .then(function (rows) {
      rows = DataAccessHelpers.restifyData(rows);
      return res.status(200).json(rows);
    })
    .catch((error) => next(error));
});

module.exports = router;
