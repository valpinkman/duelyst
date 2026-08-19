/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const express = require('express');
const request = require('superagent');
const Promise = require('bluebird');
const knex = require('../../../lib/data_access/knex');
const DataAccessHelpers = require('../../../lib/data_access/helpers');
const DecksModule = require('../../../lib/data_access/decks');
const Logger = require('../../../../app/common/logger');
const config = require('../../../../config/config');
const t = require('tcomb-validation');
const UtilsGameSession = require('../../../../app/common/utils/utils_game_session');
const GameSession = require('../../../../app/sdk/gameSession');
const Errors = require('../../../lib/custom_errors');
let Consul = require('../../../lib/consul');
const generatePushId = require('../../../../app/common/generate_push_id');
Consul = require('../../../lib/consul');
const _ = require('underscore');

const awsRegion = config.get('aws.region');
const awsReplaysBucket = config.get('aws.replaysBucketName');

const router = express.Router();

router.get('/', function (req, res, next) {
  // user id is set by a middleware
  const {
    user_id,
  } = req;
  let {
    page,
  } = req.query;

  if (page == null) { page = 0; }

  Logger.module('API').debug(`loading games for page: ${page}`);

  return knex('user_games').where('user_id', user_id).orderBy('game_id', 'desc').offset(page * 10)
    .limit(10)
    .select()
    .then(function (rows) {
      const playerFacingRows = _.map(rows, function (row) {
      // row["digest"] = DecksModule.hashForDeck(row["deck_cards"], user_id)
        row = _.omit(row, ['rating', 'rating_delta', 'is_bot_game', 'deck_cards', 'deck_id']);
        return row;
      });
      return res.status(200).json(DataAccessHelpers.restifyData(playerFacingRows));
    })
    .catch((error) => next(error));
});

router.get('/:game_id/replay_data', function (req, res, next) {
  const result = t.validate(req.params.game_id, t.subtype(t.Str, (s) => s.length <= 36));
  if (!result.isValid()) {
    return next();
  }

  // user id is set by a middleware
  const {
    user_id,
  } = req;
  const game_id = result.value;

  return knex('user_games').where('user_id', user_id).andWhere('game_id', game_id).first()
    .then(function (row) {
      if (row != null) {
        const downloadGameSessionDataAsync = new Promise(function (resolve, reject) {
          const gameDataUrl = `https://s3.${awsRegion}.amazonaws.com/${awsReplaysBucket}/${config.get('env')}/${game_id}.json`;
          Logger.module('API').debug(`starting download of game ${game_id} replay data from ${gameDataUrl}`);
          return request.get(gameDataUrl).end(function (err, res) {
            if ((res != null) && (res.status >= 400)) {
            // Network failure, we should probably return a more intuitive error object
              Logger.module('API').error(`ERROR! Failed to connect to games data: ${res.status} `.red);
              return reject(new Error('Failed to connect to games data.'));
            } else if (err) {
            // Internal failure
              Logger.module('API').error(`ERROR! _retrieveGameSessionData() failed: ${err.message} `.red);
              return reject(err);
            } else {
              return resolve(res.text);
            }
          });
        });

        const downloadMouseUIDataAsync = new Promise(function (resolve, reject) {
          const mouseUIDataUrl = `https://s3.${awsRegion}.amazonaws.com/${awsReplaysBucket}/${config.get('env')}/ui_events/${game_id}.json`;
          return request.get(mouseUIDataUrl).end(function (err, res) {
            if ((res != null) && (res.status >= 400)) {
            // Network failure, we should probably return a more intuitive error object
              Logger.module('API').error(`ERROR! Failed to connect to ui event data: ${res.status} `.red);
              return reject(new Error('Failed to connect to ui event data.'));
            } else if (err) {
            // Internal failure
              Logger.module('API').error(`ERROR! _retrieveGameUIEventData() failed: ${err.message} `.red);
              return reject(err);
            } else {
              return resolve(res.text);
            }
          });
        });

        return Promise.all([
          downloadGameSessionDataAsync,
          downloadMouseUIDataAsync,
        ]);
      } else {
        return [null, null];
      }
    })
    .spread(function (gameDataString, mouseUIDataString) {
      Logger.module('API').debug(`downloaded game ${game_id} replay data. size:${(gameDataString != null ? gameDataString.length : undefined) || 0}`);
      if ((gameDataString == null) || (mouseUIDataString == null)) {
        return res.status(404).json({});
      } else {
        let gameSessionData = JSON.parse(gameDataString);
        const mouseUIData = JSON.parse(mouseUIDataString);

        // scrub the data here
        const gameSession = GameSession.create();
        gameSession.deserializeSessionFromFirebase(JSON.parse(gameDataString));
        gameSessionData = UtilsGameSession.scrubGameSessionData(gameSession, gameSessionData, user_id, true);

        return res.status(200).json({ gameSessionData, mouseUIData });
      }
    })
    .catch((error) => next(error));
});

module.exports = router;
