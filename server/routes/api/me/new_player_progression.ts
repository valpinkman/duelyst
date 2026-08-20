/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const express = require('express');
const UsersModule = require('../../../lib/data_access/users');
const QuestsModule = require('../../../lib/data_access/quests');
const knex = require('../../../lib/data_access/knex');
const DataAccessHelpers = require('../../../lib/data_access/helpers');
const Logger = require('../../../../app/common/logger');
const t = require('tcomb-validation');

// sdk
const NewPlayerProgressionHelper = require('../../../../app/sdk/progression/newPlayerProgressionHelper');
const NewPlayerProgressionModuleLookup = require('../../../../app/sdk/progression/newPlayerProgressionModuleLookup');
const NewPlayerProgressionStageEnum = require('../../../../app/sdk/progression/newPlayerProgressionStageEnum');

const router = express.Router();

router.get('/', function (req, res, next) {
  const user_id = req.user.d.id;

  return knex('user_new_player_progression')
    .where('user_id', user_id)
    .select()
    .then(function (challengeRows) {
      challengeRows = DataAccessHelpers.restifyData(challengeRows);
      return res.status(200).json(challengeRows);
    })
    .catch((error) => next(error));
});

router.post('/core', function (req, res, next) {
  const user_id = req.user.d.id;

  return UsersModule.iterateNewPlayerCoreProgression(user_id)
    .then(function (data) {
      if (data) {
        return res.status(200).json(DataAccessHelpers.restifyData(data));
      } else {
        return res.status(304).json({});
      }
    })
    .catch((error) => next(error));
});

router.post('/:module_name/stage', function (req, res, next) {
  const _chainState: Record<string, any> = {};
  let module_name = t.validate(req.params.module_name, t.Str);
  if (!module_name.isValid()) {
    return next();
  }
  let stage = t.validate(req.body.stage, t.Str);
  if (!stage.isValid()) {
    return res.status(400).json(stage.errors);
  }

  const user_id = req.user.d.id;
  module_name = module_name.value;
  stage = stage.value;

  return UsersModule.setNewPlayerFeatureProgression(user_id, module_name, stage)
    .then(function (progressionData) {
      _chainState.progressionData = progressionData;
      if (
        module_name === NewPlayerProgressionModuleLookup.Core &&
        NewPlayerProgressionHelper.questsForStage(stage)
      ) {
        return QuestsModule.generateBeginnerQuests(user_id);
      } else {
        return Promise.resolve();
      }
    })
    .then(function (questData) {
      if (questData) {
        _chainState.questData = questData;
      }
      return res.status(200).json(DataAccessHelpers.restifyData(_chainState));
    })
    .catch((error) => next(error));
});

module.exports = router;
