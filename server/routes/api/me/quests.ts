/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const express = require('express');
const util = require('util');
const QuestsModule = require('../../../lib/data_access/quests');
const knex = require('../../../lib/data_access/knex');
const DataAccessHelpers = require('../../../lib/data_access/helpers');
const Logger = require('../../../../app/common/logger');
const Errors = require('../../../lib/custom_errors');
const t = require('tcomb-validation');

const router = express.Router();

router.get('/', function (req, res, next) {
  const user_id = req.user.d.id;

  return knex('user_quests').where('user_id', user_id).select()
    .then(function (questRows) {
      questRows = DataAccessHelpers.restifyData(questRows);
      return res.status(200).json(questRows);
    })
    .catch((error) => next(error));
});

router.post('/beginner', function (req, res, next) {
  const user_id = req.user.d.id;

  return QuestsModule.generateBeginnerQuests(user_id)
    .then((value) => // all good, send the quests over
      res.status(200).json(value)).catch(Errors.NoNeedForNewBeginnerQuestsError, (e) => res.status(304).json({})).catch(function (error) {
    // oops, looks like we have an error
      Logger.module('API').debug(`BEGINNER quests failed to generate for ${user_id.blue}`.red + ' ERROR: ' + util.inspect(error));
      return next(error);
    });
});

router.post('/daily', function (req, res, next) {
  const user_id = req.user.d.id;

  return QuestsModule.needsDailyQuests(user_id)
    .then(function (value) {
    // check if we need to update daily quests
      if (!value) {
        Logger.module('API').debug(`DAILY quests are still less than a day old for ${user_id.blue}`);
        return res.status(304).json({});
      } else {
        Logger.module('API').debug(`Generating DAILY quests for ${user_id.blue}`.magenta);
        return QuestsModule.generateDailyQuests(user_id)
          .then(function (value) {
            // all good, send the quests over
            Logger.module('API').debug(`DAILY quests GENERATED for ${user_id.blue}`.cyan);
            return res.status(200).json(value);
          }).catch(Errors.FirebaseTransactionDidNotCommitError, function (error) {
            Logger.module('API').debug(`DAILY quests did not need to update for ${user_id.blue}`);
            return res.status(304).json({});
          }).catch(function (error) {
            // oops, looks like we have an error
            Logger.module('API').debug(`DAILY quests failed to generate for ${user_id.blue}`.red + ' ERROR: ' + util.inspect(error));
            return next(error);
          });
      }
    }).catch(function (error) {
      Logger.module('API').debug(`Failed to detect if we need daily quests for ${user_id.blue}`.red + ' ERROR: ' + util.inspect(error));
      return next(error);
    });
});

router.put('/daily/:quest_index', function (req, res, next) {
  const result = t.validate(parseInt(req.params.quest_index, 10), t.Number);
  if (!result.isValid()) {
    return next();
  }

  const user_id = req.user.d.id;
  const quest_index = result.value;

  Logger.module('API').debug(`Mulligan DAILY quest ${quest_index} for ${user_id.blue}`.magenta);
  return QuestsModule.mulliganDailyQuest(user_id, quest_index)
    .then(function (value) {
    // all good, send the quests over
      Logger.module('API').debug(`DAILY quest ${quest_index} MULLIGANED for ${user_id.blue}`.cyan);
      return res.status(200).json(value);
    }).catch(Errors.QuestCantBeMulliganedError, function (error) {
      Logger.module('API').debug(`DAILY quest ${quest_index} can't be MULLIGANED again today for ${user_id.blue}`.yellow);
      return res.status(304).json({ message: 'quest already mulliganed' });
    }).catch(function (error) {
    // oops, looks like we have an error
      Logger.module('API').debug(`DAILY quest ${quest_index} failed to mulligan for ${user_id.blue}`.red + ' ERROR: ' + util.inspect(error));
      return next(error);
    });
});

module.exports = router;
