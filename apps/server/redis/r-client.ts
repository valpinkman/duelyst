/*
 * The shared redis client singleton.
 *
 * ioredis rather than node-redis v4+: this module exports a *connected client*
 * that 11 other modules require and use synchronously at load time. node-redis
 * v4 requires an explicit `await client.connect()` and rejects anything sent
 * before it, which would push an async boot step into every consumer. ioredis
 * connects on construction and queues commands until the socket is ready, so
 * the shape below stays exactly as it was under redis@2 + promisifyAll.
 *
 * Commands are promise-returning natively, so there is no promisifyAll and no
 * `*Async` suffix any more. Where a Buffer reply is needed (gzipped game state
 * in r-gamemanager) use the explicit `getBuffer()` variant; that replaces
 * redis@2's `detect_buffers: true`, which keyed off whether the KEY was a
 * Buffer and no longer exists.
 */
const Redis = require('ioredis');

const Logger = require('@duelyst/common/logger');
const config = require('@duelyst/config');

const RedisClient = new Redis({
  host: config.get('redis.host'),
  port: config.get('redis.port'),
  password: config.get('redis.password') || undefined,
  // keep retrying rather than giving up: these are long-lived game servers
  maxRetriesPerRequest: null,
});

module.exports = RedisClient;

// Ready event
RedisClient.on('ready', () => Logger.module('REDIS').debug('client onReady'));

// Connect event
RedisClient.on('connect', () => Logger.module('REDIS').debug('client onConnect'));

// Error event
// TODO: We should probably do something if we receive an error
RedisClient.on('error', (error) =>
  Logger.module('REDIS').error(`client onError: ${error && error.message})`),
);
