/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/*
Job - Setup Match
*/
const Promise = require('bluebird');
const getGameServerAsync = require('../get_gameserver');
const createGameAsync = require('../creategame');
const DuelystFirebaseModule = require('../../server/lib/duelyst_firebase_module');
const FirebasePromises = require('../../server/lib/firebase_promises');
const Logger = require('../../app/common/logger');

/**
 * Job - 'matchmaking-setupmatch'
 * TODO : convert to pull player token directly via Redis instead of being passed in
 * @param  {Object} job    Kue job
 * @param  {Function} done   Callback when job is complete
 */
module.exports = function (job, done) {
  const token1 = job.data.token1 || null;
  const token2 = job.data.token2 || null;
  const {
    gameType,
  } = job.data;

  if (!token1) {
    return done(new Error('Token 1 is not defined.'));
  }
  if (!token2) {
    return done(new Error('Token 2 is not defined.'));
  }
  if (!gameType) {
    return done(new Error('gameType is not defined.'));
  }

  Logger.module('JOB').debug(`[J:${job.id}] setup ${gameType.yellow} game (${token1.name} versus ${token2.name}) starting`);

  return getGameServerAsync()
    .bind({})
    .then(function (gameServer) {
      this.gameServer = gameServer;
      if (!gameServer) {
        job.log('Not assigning to specific server.');
      } else {
        job.log('Assigned to %s', gameServer);
      }
      return createGameAsync(gameType, token1, token2, gameServer);
    }).then(function (gameId) {
      Logger.module('JOB').debug(`[J:${job.id}] Setup ${gameType.toUpperCase()} Game ID:${gameId} SERVER:${this.gameServer} (${token1.name} versus ${token2.name}) done()`);
      return done(null, { gameId });
    })
    .catch((error) => // Note we are leaking a 'unsanitized' error message here
    // write failed message to both players firebases
      DuelystFirebaseModule.connect().getRootRef()
        .then((rootRef) => Promise.all([
          FirebasePromises.set(rootRef.child(`user-matchmaking-errors/${token1.userId}/${token1.id}`), error.message),
          FirebasePromises.set(rootRef.child(`user-matchmaking-errors/${token2.userId}/${token2.id}`), error.message),
        ])).finally(() => // Mark job as failed
          done(error)));
};
