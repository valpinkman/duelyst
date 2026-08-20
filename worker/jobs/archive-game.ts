/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/*
Job - Archive Game
*/
const GamesModule = require('../../server/lib/data_access/games');
const uploadGameToS3 = require('../upload_game_to_s3');
const config = require('../../config/config.js');

const env = config.get('env');
const { GameManager } = require('../../server/redis');
const Promise = require('bluebird');
const Logger = require('../../app/common/logger');

/**
 * Job - 'archive-game'
 * Uploads serialized game data from Redis to S3 as JSON file
 * @param  {Object} job    Kue job
 * @param  {Function} done   Callback when job is complete
 */
module.exports = function (job, done) {
  const gameId = job.data.gameId || null;
  if (!gameId) {
    return done(new Error('Game ID is not defined.'));
  }

  Logger.module('JOB').debug(`[J:${job.id}] archive-game -> (${gameId}) starting`);

  return Promise.all([
    GameManager.loadGameSession(gameId),
    GameManager.loadGameMouseUIData(gameId),
  ])
    .bind({})
    .then(function ([serializedGameData, serializedMouseAndUIEventData]) {
      this.serializedGameData = serializedGameData;
      if (!serializedGameData) {
        throw new Error('Game data is null. Game may have already been archived.');
      } else {
        if ((serializedMouseAndUIEventData == null)) {
          Logger.module('JOB').warn(`[J:${job.id}] archive-game -> WARNING: mouse data not present for game:${gameId}`);
        }
        return uploadGameToS3(gameId, serializedGameData, serializedMouseAndUIEventData);
      }
    }).then(function (url) {
      this.url = url;
      Logger.module('JOB').debug(`[J:${job.id}] archive-game -> (${gameId}) uploaded to ${url}.`);
      Logger.module('JOB').debug(`[J:${job.id}] archive-game -> (${gameId}) saving game metadata.`);
      return GamesModule.saveGameMetadata(gameId, JSON.parse(this.serializedGameData), url);
    })
    .then(function () {
      Logger.module('JOB').debug(`[J:${job.id}] archive-game -> (${gameId}) DONE. - ${this.url}`);
      return done();
    })
    .catch((error) => done(error));
};
