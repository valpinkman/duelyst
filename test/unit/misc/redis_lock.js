/*
 * Contract tests for the in-house redis lock that replaced @counterplay/warlock.
 *
 * Driven by a fake redis rather than a real one so this runs in the unit suite:
 * what is being pinned is the LOCK PROTOCOL (SET ... PX ttl NX, parity delete),
 * not redis itself. The parity behaviour is the reason this file exists -- a
 * plain DEL on unlock would release a lock that had already expired and been
 * re-acquired by someone else, which is silent cross-user corruption.
 */
const { expect } = require('chai');
const makeLock = require('@duelyst/server/redis/r-lock');

/** Minimal stand-in implementing only what r-lock uses. */
function fakeRedis() {
  const store = new Map();
  return {
    store,
    calls: [],
    set(key, value, ...args) {
      this.calls.push(['set', key, value, ...args]);
      const nx = args.includes('NX');
      if (nx && store.has(key)) {
        return Promise.resolve(null);
      }
      store.set(key, value);
      return Promise.resolve('OK');
    },
    exists(key) {
      return Promise.resolve(store.has(key) ? 1 : 0);
    },
    // mimics the parity-delete script
    eval(_script, _numKeys, key, id) {
      if (store.get(key) === id) {
        store.delete(key);
        return Promise.resolve(1);
      }
      return Promise.resolve(0);
    },
  };
}

describe('redis lock', () => {
  it('acquires a lock and returns an unlock function', async () => {
    const lock = makeLock(fakeRedis());
    const unlock = await lock.lock('player1', 5000);
    expect(unlock).to.be.a('function');
  });

  it("uses warlock's key format so stored data is unchanged", async () => {
    const redis = fakeRedis();
    await makeLock(redis).lock('player1', 5000);
    expect([...redis.store.keys()]).to.deep.equal(['player1:lock']);
  });

  it('sets the ttl with PX and guards with NX', async () => {
    const redis = fakeRedis();
    await makeLock(redis).lock('player1', 1234);
    const [cmd, key, , px, ttl, nx] = redis.calls[0];
    expect(cmd).to.equal('set');
    expect(key).to.equal('player1:lock');
    expect(px).to.equal('PX');
    expect(ttl).to.equal(1234);
    expect(nx).to.equal('NX');
  });

  it('refuses a second lock on the same key', async () => {
    const lock = makeLock(fakeRedis());
    expect(await lock.lock('player1', 5000)).to.be.a('function');
    expect(await lock.lock('player1', 5000)).to.equal(false);
  });

  it('allows locks on different keys', async () => {
    const lock = makeLock(fakeRedis());
    expect(await lock.lock('player1', 5000)).to.be.a('function');
    expect(await lock.lock('player2', 5000)).to.be.a('function');
  });

  it('releases via the returned unlock function, allowing re-locking', async () => {
    const lock = makeLock(fakeRedis());
    const unlock = await lock.lock('player1', 5000);
    expect(await unlock()).to.equal(1);
    expect(await lock.lock('player1', 5000)).to.be.a('function');
  });

  // The reason unlock is a parity script and not a DEL.
  it('does NOT release a lock that has been re-acquired by someone else', async () => {
    const redis = fakeRedis();
    const lock = makeLock(redis);

    const staleUnlock = await lock.lock('player1', 5000);
    // simulate ttl expiry
    redis.store.delete('player1:lock');
    // a different holder takes it
    await lock.lock('player1', 5000);

    // the stale release must be a no-op
    expect(await staleUnlock()).to.equal(0);
    // and the new holder keeps its lock
    expect(await lock.isLocked('player1')).to.equal(true);
  });

  it('reports isLocked as a boolean', async () => {
    const lock = makeLock(fakeRedis());
    expect(await lock.isLocked('player1')).to.equal(false);
    await lock.lock('player1', 5000);
    expect(await lock.isLocked('player1')).to.equal(true);
  });

  it('rejects non-string keys, like warlock did', async () => {
    const lock = makeLock(fakeRedis());
    const errs = await Promise.all(
      [() => lock.lock(42, 1), () => lock.isLocked(42)].map((fn) =>
        fn().then(
          () => null,
          (e) => e.message,
        ),
      ),
    );
    expect(errs).to.deep.equal(['lock key must be string', 'lock key must be string']);
  });

  it('issues a distinct id per lock, so ids cannot collide', async () => {
    const redis = fakeRedis();
    const lock = makeLock(redis);
    await lock.lock('a', 5000);
    await lock.lock('b', 5000);
    expect(redis.store.get('a:lock')).to.not.equal(redis.store.get('b:lock'));
  });
});
