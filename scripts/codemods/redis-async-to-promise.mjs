#!/usr/bin/env node
/*
 * `client.<cmd>Async(...)` -> `client.<cmd>(...)`
 *
 * Under redis@2 the client was run through bluebird's promisifyAll, which
 * appended `Async` to every command. ioredis returns promises natively, so the
 * suffix goes away entirely.
 *
 * Restricted to an explicit list of REDIS COMMAND NAMES rather than a generic
 * /\w+Async\(/ sweep, because this codebase has application methods that also
 * end in Async (`whenHighlightedGeneralsAsync`,
 * `getFirstUnreadAnnouncementContentAsync`) and renaming those would break
 * unrelated call sites while looking like a clean mechanical change.
 */
import fs from 'node:fs';

const COMMANDS = [
  'get', 'set', 'del', 'exists', 'expire', 'ttl', 'incr', 'decr',
  'hget', 'hset', 'hmset', 'hgetall', 'hdel', 'hincrby',
  'lpush', 'rpush', 'lrange', 'llen', 'lrem', 'lpop', 'rpop',
  'sadd', 'srem', 'smembers', 'sismember', 'scard',
  'zadd', 'zrem', 'zscore', 'zcard', 'zrange', 'zrevrange',
  'zrangebyscore', 'zrevrangebyscore', 'zrank', 'zrevrank',
  'zremrangebyscore', 'zremrangebyrank', 'zincrby', 'zcount',
  'exec', 'eval', 'evalsha', 'keys', 'scan', 'flushdb', 'ping',
];

const re = new RegExp(`\\.(${COMMANDS.join('|')})Async\\s*\\(`, 'g');

let total = 0; let files = 0;
for (const file of process.argv.slice(2)) {
  const before = fs.readFileSync(file, 'utf8');
  const hits = (before.match(re) || []).length;
  if (!hits) continue;
  fs.writeFileSync(file, before.replace(re, '.$1('));
  total += hits; files += 1;
  console.log(`  ${file}: ${hits}`);
}
console.log(`\n${total} redis command call(s) de-suffixed across ${files} file(s)`);
