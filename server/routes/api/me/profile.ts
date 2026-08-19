/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const express = require('express');
const UsersModule = require('../../../lib/data_access/users');
const knex = require('../../../lib/data_access/knex');
const DataAccessHelpers = require('../../../lib/data_access/helpers');
const Logger = require('../../../../app/common/logger');
const Errors = require('../../../lib/custom_errors');
const t = require('tcomb-validation');
const uuid = require('node-uuid');
const moment = require('moment');
const Promise = require('bluebird');

const router = express.Router();

router.put('/portrait_id', function (req, res, next) {
  const result = t.validate(req.body.portrait_id, t.Number);
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const user_id = req.user.d.id;
  const new_portrait_id = result.value;

  return UsersModule.setPortraitId(user_id, new_portrait_id)
    .then(() => res.status(200).json({})).catch((error) => next(error));
});

router.put('/battle_map_id', function (req, res, next) {
  const result = t.validate(req.body.battle_map_id, t.maybe(t.Number));
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const user_id = req.user.d.id;
  const new_battle_map_id = result.value;

  return UsersModule.setBattleMapId(user_id, new_battle_map_id)
    .then(() => res.status(200).json({})).catch((error) => next(error));
});

router.put('/card_back_id', function (req, res, next) {
  const result = t.validate(req.body.card_back_id, t.Number);
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const user_id = req.user.d.id;
  const new_card_back_id = result.value;

  return UsersModule.setCardBackId(user_id, new_card_back_id)
    .then(() => res.status(200).json({})).catch((error) => next(error));
});

module.exports = router;
