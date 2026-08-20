/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/*
Job - Update User Ranking
*/
const config = require('../../config/config.js');
const RankModule = require('../../server/lib/data_access/rank');
const Logger = require('../../app/common/logger');

// TODO: Can this be removed?

/**
 * Job - 'update-user-ranking'
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
    `[J:${job.id}] Update User (${userId}) Ranking for game ${gameId} starting`,
  );

  return RankModule.updateUserRankingWithGameOutcome(userId, isWinner, gameId, isDraw)
    .then(function () {
      Logger.module('JOB').debug(
        `[J:${job.id}] Update User (${userId}) Ranking for game ${gameId} done()`,
      );
      return done();
    })
    .catch((error) => done(error));
};
