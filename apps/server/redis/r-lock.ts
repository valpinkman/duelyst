/*
 * A minimal redis lock, replacing @counterplay/warlock (a vendored fork that
 * pulled node-redis-scripty; both unmaintained, and we used three functions).
 *
 * The contract is deliberately identical to warlock's, including the key
 * format, so nothing about the data in redis changes:
 *
 *   lock:     SET <key>:lock <id> PX <ttl> NX   -> unlock fn, or false
 *   isLocked: EXISTS <key>:lock                 -> boolean
 *   unlock:   parity delete, via Lua
 *
 * The parity check is the part that matters and the reason unlock is a script
 * rather than a plain DEL: by the time a holder releases, its ttl may already
 * have expired and *another* holder may own the key. Deleting unconditionally
 * would release someone else's lock. The script only deletes when the stored
 * id still matches the one we wrote, and being a script it is atomic.
 */
const crypto = require('crypto');

const PARITY_DEL = `
local value = redis.call('get', KEYS[1])
if value == ARGV[1] then
  return redis.call('del', KEYS[1])
end
return 0
`;

const makeKey = (key) => `${key}:lock`;

module.exports = function (redis) {
  const lock: Record<string, any> = {};

  lock.makeKey = makeKey;

  /**
   * Acquire a lock.
   * @param {String} key
   * @param {Number} ttl milliseconds the lock may live
   * @returns {Promise} an unlock function if acquired, otherwise false
   */
  lock.lock = function (key, ttl) {
    if (typeof key !== 'string') {
      return Promise.reject(new Error('lock key must be string'));
    }

    const id = crypto.randomBytes(16).toString('base64');
    return redis.set(makeKey(key), id, 'PX', ttl, 'NX').then((result) => {
      if (!result) return false; // someone else holds it
      return () => lock.unlock(key, id);
    });
  };

  /**
   * Release a lock, but only if we still hold it.
   * @returns {Promise} 1 if released, 0 if it had already expired or moved on
   */
  lock.unlock = function (key, id) {
    if (typeof key !== 'string') {
      return Promise.reject(new Error('lock key must be string'));
    }
    return redis.eval(PARITY_DEL, 1, makeKey(key), id);
  };

  /**
   * @returns {Promise} true if the key is currently locked
   */
  lock.isLocked = function (key) {
    if (typeof key !== 'string') {
      return Promise.reject(new Error('lock key must be string'));
    }
    return redis.exists(makeKey(key)).then((exists) => Boolean(exists));
  };

  return lock;
};
