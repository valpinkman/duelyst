/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/*
Job - Update two Users Ratings after playing a Rank 0 match
*/
const config = require('../../config/config.js');
const RankModule = require('../../server/lib/data_access/rank');
const Logger = require('../../app/common/logger');

/**
 * Job - 'update-users-ratings'
 * @param  {Object} job    Kue job
 * @param  {Function} done   Callback when job is complete
 */
module.exports = function (job, done) {
  const gameId = job.data.gameId || null;
  const player1UserId = job.data.player1UserId || null;
  const player1IsRanked = job.data.player1IsRanked || false;
  const player2UserId = job.data.player2UserId || null;
  const player2IsRanked = job.data.player2IsRanked || false;
  const { player1IsWinner } = job.data;
  const { isDraw } = job.data;

  if (!gameId) {
    return done(new Error('Game ID is not defined.'));
  }
  if (!player1UserId) {
    return done(new Error('Player 1 User ID is not defined.'));
  }
  if (!player2UserId) {
    return done(new Error('Player 2 User ID is not defined.'));
  }
  if (player1IsWinner == null) {
    return done(new Error('player1IsWinner is not defined.'));
  }

  Logger.module('JOB').debug(
    `[J:${job.id}] Update Users [${player1UserId},${player2UserId}] Ratings for game ${gameId} starting`,
  );

  return RankModule.updateUsersRatingsWithGameOutcome(
    player1UserId,
    player2UserId,
    player1IsWinner,
    gameId,
    isDraw,
    player1IsRanked,
    player2IsRanked,
  )
    .then(function () {
      Logger.module('JOB').debug(
        `[J:${job.id}] Update Users [${player1UserId},${player2UserId}] Ratings for game ${gameId} done()`,
      );
      return done();
    })
    .catch((error) => done(error));
};
