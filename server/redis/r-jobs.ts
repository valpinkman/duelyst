/*
 * The job queue, on BullMQ.
 *
 * Replaces kue 0.11.6, unmaintained since 2017, which dragged express 4, pug 2
 * beta, stylus, nib, yargs 4 and its own pinned redis@2.6 into the tree.
 *
 * kue modelled everything as ONE queue with many job "types"; BullMQ models a
 * queue per name, so here queue name == job type. That preserves the per-type
 * concurrency the worker declares, and keeps `enqueue('some-type', ...)`
 * reading the way the old builder call did.
 *
 * The queue keys are NOT compatible with kue's. Jobs in flight across the
 * cutover are dropped, which is acceptable here: every producer sets
 * removeOnComplete, so the queue only ever holds transient work.
 */
const { Queue, Worker, QueueEvents } = require('bullmq');

const Logger = require('../../app/common/logger');
const config = require('../../config/config');
const PromiseUtils = require('../../app/common/utils/utils_promise');

const env = config.get('env');

// BullMQ builds its own ioredis connections from this.
const connection = {
  host: config.get('redis.host'),
  port: config.get('redis.port'),
  password: config.get('redis.password') || undefined,
  // BullMQ requires this: its blocking commands must never be given up on
  maxRetriesPerRequest: null,
};

const prefix = `${env}:bq`;

const queues = new Map();
const queueEvents = new Map();

const queueFor = function (name) {
  if (!queues.has(name)) {
    const queue = new Queue(name, { connection, prefix });
    queue.on('error', (err) => Logger.module('JOBS').error(`queue ${name} error: ${err && err.message}`));
    queues.set(name, queue);
  }
  return queues.get(name);
};

const eventsFor = function (name) {
  if (!queueEvents.has(name)) {
    const events = new QueueEvents(name, { connection, prefix });
    events.on('error', (err) => Logger.module('JOBS').error(`queue events ${name} error: ${err && err.message}`));
    queueEvents.set(name, events);
  }
  return queueEvents.get(name);
};

/**
 * Enqueue a job.
 * @param {String} name job type (also the queue name)
 * @param {Object} data job payload
 * @param {Object} [opts] { delay, removeOnComplete, attempts, priority }
 * @returns {Promise} resolves to the BullMQ Job
 */
exports.enqueue = function (name, data, opts) {
  const o = opts || {};
  return queueFor(name).add(name, data, {
    /*
     * Every kue producer set removeOnComplete(true), and the intent -- do not
     * accumulate finished jobs forever -- is preserved. But it CANNOT be a
     * plain `true` here: BullMQ's waitUntilFinished reads the job's key to get
     * its result, so a job deleted the instant it completes fails the waiter
     * with "Missing key for job ... isFinished". kue did not have this problem
     * because it pushed completion events rather than reading job state.
     *
     * Keeping a short, bounded tail instead makes waitFor reliable (the game
     * server waits on both post-game jobs) while still bounding what redis
     * holds.
     */
    removeOnComplete: o.removeOnComplete === false ? false : { age: 300, count: 1000 },
    // keep a bounded tail of failures for debugging rather than every one
    removeOnFail: o.removeOnFail === undefined ? 100 : o.removeOnFail,
    ...(o.delay ? { delay: o.delay } : {}),
    ...(o.attempts ? { attempts: o.attempts } : {}),
    ...(o.priority ? { priority: o.priority } : {}),
  });
};

/**
 * Wait for a job to finish, from another process.
 *
 * This is the one kue feature with no drop-in equivalent: the game server
 * enqueues both players' post-game jobs and must not update ratings until the
 * worker has finished them. kue exposed per-job event emitters; BullMQ routes
 * the same information through QueueEvents.
 *
 * @returns {Promise} the job's return value, or rejects with its failure
 */
exports.waitFor = function (job) {
  return job.waitUntilFinished(eventsFor(job.queueName));
};

/**
 * Register a processor.
 * @param {String} name job type
 * @param {Number} concurrency
 * @param {Function} handler legacy kue-style (job, done) handler
 * @param {Object} [opts] { ttl } ms after which the job is failed
 * @returns {Worker}
 */
exports.process = function (name, concurrency, handler, opts) {
  const o = opts || {};

  const run = function (job) {
    // The 13 handlers are kue-shaped `(job, done)`. Adapting the signature here
    // rather than rewriting all of them keeps this change to the queue itself.
    const result = new Promise((resolve, reject) => {
      handler(job, (err, value) => (err ? reject(err) : resolve(value)));
    });
    // kue's .ttl(ms) failed a job that had not finished in time. BullMQ has no
    // equivalent -- its stalled-job detection covers a worker that DIES, not a
    // handler that hangs -- so the timeout is applied here instead.
    return o.ttl ? PromiseUtils.withTimeout(result, o.ttl, `job ${name} exceeded ttl ${o.ttl}ms`) : result;
  };

  const worker = new Worker(name, run, { connection, prefix, concurrency });
  worker.on('failed', (job, err) => Logger.module('JOBS').error(`[J:${job && job.id}] ${name} failed: ${err && err.message}`));
  worker.on('error', (err) => Logger.module('JOBS').error(`worker ${name} error: ${err && err.message}`));
  return worker;
};

/** Close every queue and event listener this process opened. */
exports.shutdown = function () {
  const closing = [];
  queues.forEach((q) => closing.push(q.close()));
  queueEvents.forEach((e) => closing.push(e.close()));
  queues.clear();
  queueEvents.clear();
  return Promise.all(closing);
};

exports.queueFor = queueFor;
