/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/*
Job - Update User Ranking
*/
const config = require('../../config/config.js');
const SyncModule = require('../../server/lib/data_access/sync');
const Logger = require('@duelyst/common/logger');

/**
 * Job to sync user's buddy list to SQL.
 * @param  {Object} job    Kue job
 * @param  {Function} done   Callback when job is complete
 */
module.exports = function (job, done) {
  // disable this job early
  return done();

  const userId = job.data.userId || null;
  if (!userId) {
    return done(new Error('User ID is not defined.'));
  }

  Logger.module('JOB').debug(`[J:${job.id}] sync user (${userId}) buddy list starting`);
  Logger.module('JOB').time(`[J:${job.id}] synced user (${userId}) buddy list`);

  return SyncModule.syncBuddyListFromFirebaseToSQL(userId)
    .then(function () {
      Logger.module('JOB').timeEnd(`[J:${job.id}] synced user (${userId}) buddy list`);
      return done();
    })
    .catch((error) => done(error));
};
