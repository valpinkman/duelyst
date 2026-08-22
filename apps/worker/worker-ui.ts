/*
 * Job queue dashboard.
 *
 * kue shipped its own express+pug app (`kue.app.listen(4000)`), which is a
 * large part of why kue pulled express 4, pug 2-beta, stylus and nib into the
 * tree. BullMQ has no built-in UI, so this mounts bull-board over the same
 * queues on the same port, keeping the compose service unchanged.
 */
const express = require('express');
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');

const Logger = require('@duelyst/common/logger');
const Jobs = require('../server/redis/r-jobs');

/*
 * Every job type this deployment runs. BullMQ uses one queue per type, so the
 * dashboard has to be told about each one; kue had a single queue and
 * discovered types at runtime.
 */
const JOB_TYPES = [
  'archive-game',
  'update-user-post-game',
  'update-user-achievements',
  'update-user-charge-log',
  'matchmaking-setup-game',
  'matchmaking-search-ranked',
  'matchmaking-search-casual',
  'matchmaking-search-arena',
  'matchmaking-search-rift',
  'data-sync-user-buddy-list',
  'process-user-referral-event',
  'update-users-ratings',
  'update-user-seen-on',
  'rotate-bosses',
];

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/');

createBullBoard({
  queues: JOB_TYPES.map((name) => new BullMQAdapter(Jobs.queueFor(name))),
  serverAdapter,
});

const app = express();
app.use('/', serverAdapter.getRouter());
app.listen(4000);

Logger.module('WORKER').log('Worker UI started on port 4000');
