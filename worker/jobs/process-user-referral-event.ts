/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/*
Job - Update User Ranking
*/
const config = require('../../config/config.js');
const ReferralsModule = require('../../server/lib/data_access/referrals');
const Logger = require('../../app/common/logger');

/**
 * @param  {Object} job    Kue job
 * @param  {Function} done   Callback when job is complete
 */
module.exports = function (job, done) {
  const userId = job.data.userId || null;
  const referrerId = job.data.referrerId || null;
  const eventType = job.data.eventType || null;

  if (!userId) {
    return done(new Error('User ID is not defined.'));
  }
  if (!referrerId) {
    return done(new Error('referrerId is not defined.'));
  }
  if (!eventType) {
    return done(new Error('eventType is not defined.'));
  }

  Logger.module('JOB').debug(
    `[J:${job.id}] User (${userId}) generated referral event \"${eventType}\" for code \"${referrerId}\" ... starting`,
  );
  Logger.module('JOB').time(
    `[J:${job.id}] User (${userId}) generated referral event \"${eventType}\" for code \"${referrerId}\"`,
  );

  return ReferralsModule.processReferralEventForUser(userId, referrerId, eventType)
    .then(function () {
      Logger.module('JOB').timeEnd(
        `[J:${job.id}] User (${userId}) generated referral event \"${eventType}\" for code \"${referrerId}\"`,
      );
      return done();
    })
    .catch((error) => done(error));
};
