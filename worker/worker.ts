/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const fs = require('fs');
const os = require('os');
const Logger = require('@duelyst/common/logger');
const config = require('../config/config.js');
const { Jobs } = require('../server/redis');

// Long stack traces used to be switched on here via bluebird
// (Promise.longStackTraces + BLUEBIRD_DEBUG). Native promises have no such
// call; node emits async stack traces for them by default, so there is
// nothing to enable.

// Increase the number of event listeners in Node.js.
// Raising this suppresses benign warnings without losing leak detection.
const events = require('events');

events.EventEmitter.defaultMaxListeners = 20; // Default is 10.

/*
Job Queue Consumer // aka Worker
*/
const worker = require('../server/redis/r-jobs');

/*
 * Per-job failure logging now lives in the seam (r-jobs `process()` attaches a
 * 'failed' listener to every worker), because BullMQ reports failures per
 * queue rather than through one global emitter as kue did.
 */

const workers = [];

/*
Shutdown: stop accepting work, let running jobs finish, then close connections.
*/
const cleanShutdown = function () {
  Logger.module('WORKER').log('Shutting down.');
  // Worker.close() waits for the jobs currently being processed
  return Promise.all(workers.map((w) => w.close()))
    .then(() => worker.shutdown())
    .then(() => process.exit(0))
    .catch((err) => {
      Logger.module('WORKER').error(`Shutdown error occured: ${err.message}`);
      return process.exit(1);
    });
};

process.on('SIGTERM', cleanShutdown);
process.on('SIGINT', cleanShutdown);
process.on('SIGHUP', cleanShutdown);
process.on('SIGQUIT', cleanShutdown);
process.on('SIGABRT', cleanShutdown);

/*
Setup Jobs
*/
const archiveGame = require('./jobs/archive-game');
const updateUserPostGame = require('./jobs/update-user-post-game');
const updateUserAchievements = require('./jobs/update-user-achievements');
const updateUserChargeLog = require('./jobs/update-user-charge-log');
const matchmakingSetupGame = require('./jobs/matchmaking-setupgame');
const matchmakingSearchRanked = require('./jobs/matchmaking-search-ranked');
const matchmakingSearchCasual = require('./jobs/matchmaking-search-casual');
const matchmakingSearchArena = require('./jobs/matchmaking-search-arena');
const matchmakingSearchRift = require('./jobs/matchmaking-search-rift');
const dataSyncUserBuddyList = require('./jobs/data-sync-user-buddy-list');
const processUserReferralEvent = require('./jobs/process-user-referral-event');
const updateUsersRatings = require('./jobs/update-users-ratings');
const updateUserSeenOn = require('./jobs/update-user-seen-on');
const rotateBosses = require('./jobs/rotate-bosses');

/*
 * `ttl` replaces kue's per-job .ttl(15000), which failed a job that had not
 * completed in time. Its producers only ever set it on these two job types, so
 * it is declared here rather than repeated at all six call sites.
 */
workers.push(worker.process('archive-game', 1, archiveGame));
workers.push(worker.process('update-user-post-game', 2, updateUserPostGame));
workers.push(worker.process('update-user-achievements', 1, updateUserAchievements, { ttl: 15000 }));
workers.push(worker.process('update-user-charge-log', 1, updateUserChargeLog));
workers.push(worker.process('matchmaking-setup-game', 1, matchmakingSetupGame));
workers.push(worker.process('matchmaking-search-ranked', 1, matchmakingSearchRanked));
workers.push(worker.process('matchmaking-search-casual', 1, matchmakingSearchCasual));
workers.push(worker.process('matchmaking-search-arena', 1, matchmakingSearchArena));
workers.push(worker.process('matchmaking-search-rift', 1, matchmakingSearchRift));
workers.push(worker.process('data-sync-user-buddy-list', 1, dataSyncUserBuddyList));
workers.push(
  worker.process('process-user-referral-event', 1, processUserReferralEvent, { ttl: 15000 }),
);
workers.push(worker.process('update-users-ratings', 1, updateUsersRatings));
workers.push(worker.process('update-user-seen-on', 1, updateUserSeenOn));

// Run the rotateBosses job once on startup.
// TODO: Find another way to trigger this hourly.
workers.push(worker.process('rotate-bosses', 1, rotateBosses));
const runRotateBossesJob = () =>
  Jobs.enqueue(
    'rotate-bosses',
    {
      name: 'Rotate Bosses',
      title: 'Rotating Boss Event',
    },
    { removeOnComplete: true },
  );
setTimeout(runRotateBossesJob, 1000);
