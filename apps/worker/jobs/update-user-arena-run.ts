/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/*
Job - Update User Ranking
*/
const config = require('config/config.js');
const GauntletModule = require('../../server/lib/data_access/gauntlet');
const Logger = require('@duelyst/common/logger');

/**
 * Job - 'update-user-arena-run'
 * @param  {Object} job    Kue job
 * @param  {Function} done   Callback when job is complete
 */
module.exports = function (job, done) {
  const gameId = job.data.gameId || null;
  const userId = job.data.userId || null;
  const { isWinner } = job.data;
  const { isDraw } = job.data;

  if (!gameId) {
    return done(new Error('Game ID is not defined.'));
  }
  if (!userId) {
    return done(new Error('User ID is not defined.'));
  }
  if (isWinner === undefined) {
    return done(new Error('isWinner is not defined.'));
  }

  Logger.module('JOB').debug(
    `[J:${job.id}] Update User (${userId}) Arena Run for game ${gameId} starting`,
  );
  Logger.module('JOB').time(`[J:${job.id}] Update User (${userId}) Arena Run for game ${gameId}`);

  return GauntletModule.updateArenaRunWithGameOutcome(userId, isWinner, gameId, isDraw)
    .then(function () {
      Logger.module('JOB').timeEnd(
        `[J:${job.id}] Update User (${userId}) Arena Run for game ${gameId}`,
      );
      return done();
    })
    .catch((error) => done(error));
};
