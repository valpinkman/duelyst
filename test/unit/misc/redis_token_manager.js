/*
 * Covers server/redis/r-tokenmanager.ts `get()`.
 *
 * A player with no matchmaking token must read back as null. Every caller -
 * POST /matchmaking, the bot-game re-check, setupInvite, and the four
 * matchmaking-search jobs - tests `token != null` to mean "this player is
 * already waiting for a game", so a non-null empty object makes every player
 * look permanently queued: POST /matchmaking short-circuits and answers 200
 * with `{tokenId: undefined}` before ever pushing them into a queue, and the
 * client sits on the loading screen forever.
 *
 * That is exactly what the redis@2 -> ioredis port introduced: redis@2 +
 * promisifyAll resolved hgetall on a missing key to null, ioredis resolves it
 * to an empty object. No suite touched this file, so it shipped.
 */
const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
const { expect } = require('chai');

const makeTokenManager = require('server/redis/r-tokenmanager');

// A fake standing in for ioredis: hgetall on a missing key resolves to {}.
const fakeRedis = () => {
  const hashes = {};
  return {
    hashes,
    hmset(key, obj) {
      hashes[key] = Object.assign({}, obj);
      return Promise.resolve('OK');
    },
    hgetall(key) {
      return Promise.resolve(hashes[key] != null ? hashes[key] : {});
    },
    del(keys) {
      const arr = Array.isArray(keys) ? keys : [keys];
      arr.forEach((k) => delete hashes[k]);
      return Promise.resolve(arr.length);
    },
    exists(key) {
      return Promise.resolve(hashes[key] != null ? 1 : 0);
    },
  };
};

describe('redis token manager', function () {
  it('returns null for a player with no token', async function () {
    const TokenManager = makeTokenManager(fakeRedis());

    expect(await TokenManager.get('no-such-player')).to.equal(null);
  });

  it('round trips a stored token, parsing deck and battle map indexes', async function () {
    const TokenManager = makeTokenManager(fakeRedis());
    const token = TokenManager.create({
      userId: 'player-1',
      name: 'player one',
      deck: [{ id: 1 }, { id: 2 }],
      battleMapIndexes: [3, 8],
    });

    await TokenManager.add(token);
    const stored = await TokenManager.get('player-1');

    expect(stored).to.not.equal(null);
    expect(stored.userId).to.equal('player-1');
    expect(stored.deck).to.deep.equal([{ id: 1 }, { id: 2 }]);
    expect(stored.battleMapIndexes).to.deep.equal([3, 8]);
  });

  it('returns null again once the token is removed', async function () {
    const TokenManager = makeTokenManager(fakeRedis());
    const token = TokenManager.create({ userId: 'player-1', deck: [{ id: 1 }] });

    await TokenManager.add(token);
    await TokenManager.remove('player-1');

    expect(await TokenManager.get('player-1')).to.equal(null);
  });
});
