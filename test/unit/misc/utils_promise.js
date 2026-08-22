/*
 * Contract tests for the bluebird replacement helpers.
 *
 * These matter more than usual: the whole point of PromiseUtils is that the
 * naive native equivalents (`Promise.all(a.map(f))`, a bare `.catch`) have
 * DIFFERENT semantics from the bluebird idioms they replace, in ways that fail
 * silently rather than loudly. So each test below pins a behaviour that a
 * plausible "simplification" of the helper would break.
 */
const { expect } = require('chai');
const PromiseUtils = require('@duelyst/common/utils/utils_promise');

describe('PromiseUtils', () => {
  describe('map()', () => {
    it('maps values and preserves input order', async () => {
      const out = await PromiseUtils.map([1, 2, 3], (n) => Promise.resolve(n * 2));
      expect(out).to.deep.equal([2, 4, 6]);
    });

    it('preserves order even when later items settle first', async () => {
      const out = await PromiseUtils.map([30, 10, 20], (ms) => PromiseUtils.delay(ms, ms));
      expect(out).to.deep.equal([30, 10, 20]);
    });

    it('passes (item, index, length) to the mapper, like bluebird', async () => {
      const seen = [];
      await PromiseUtils.map(['a', 'b'], (item, i, len) => {
        seen.push([item, i, len]);
      });
      expect(seen).to.deep.equal([
        ['a', 0, 2],
        ['b', 1, 2],
      ]);
    });

    it('resolves promises inside the list before calling the mapper', async () => {
      const out = await PromiseUtils.map([Promise.resolve(5)], (n) => n + 1);
      expect(out).to.deep.equal([6]);
    });

    it('accepts a promise for the list', async () => {
      const out = await PromiseUtils.map(Promise.resolve([1, 2]), (n) => n * 3);
      expect(out).to.deep.equal([3, 6]);
    });

    it('handles an empty list', async () => {
      expect(
        await PromiseUtils.map([], () => {
          throw new Error('never');
        }),
      ).to.deep.equal([]);
    });

    // The one that actually guards a bug: achievements.ts relies on concurrency 1
    // to stop concurrent writes overwriting the card log.
    it('runs SERIALLY with {concurrency: 1}', async () => {
      let inFlight = 0;
      let maxInFlight = 0;
      await PromiseUtils.map(
        [1, 2, 3, 4],
        async () => {
          inFlight += 1;
          maxInFlight = Math.max(maxInFlight, inFlight);
          await PromiseUtils.delay(5);
          inFlight -= 1;
        },
        { concurrency: 1 },
      );
      expect(maxInFlight).to.equal(1);
    });

    it('never exceeds the concurrency limit', async () => {
      let inFlight = 0;
      let maxInFlight = 0;
      await PromiseUtils.map(
        [1, 2, 3, 4, 5, 6, 7, 8],
        async () => {
          inFlight += 1;
          maxInFlight = Math.max(maxInFlight, inFlight);
          await PromiseUtils.delay(5);
          inFlight -= 1;
        },
        { concurrency: 3 },
      );
      expect(maxInFlight).to.equal(3);
    });

    it('runs concurrently when no concurrency is given', async () => {
      let inFlight = 0;
      let maxInFlight = 0;
      await PromiseUtils.map([1, 2, 3, 4], async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await PromiseUtils.delay(5);
        inFlight -= 1;
      });
      expect(maxInFlight).to.equal(4);
    });

    it('rejects if any mapper rejects', async () => {
      let err = null;
      await PromiseUtils.map([1, 2, 3], (n) => {
        if (n === 2) throw new Error('boom');
        return n;
      }).catch((e) => {
        err = e;
      });
      expect(err && err.message).to.equal('boom');
    });
  });

  describe('each()', () => {
    it('is always serial', async () => {
      let inFlight = 0;
      let maxInFlight = 0;
      await PromiseUtils.each([1, 2, 3], async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await PromiseUtils.delay(5);
        inFlight -= 1;
      });
      expect(maxInFlight).to.equal(1);
    });

    it('visits items in order', async () => {
      const seen = [];
      await PromiseUtils.each([1, 2, 3], (n) => PromiseUtils.delay(1).then(() => seen.push(n)));
      expect(seen).to.deep.equal([1, 2, 3]);
    });

    // bluebird's contract: resolves to the original list, NOT the iterator results.
    it('resolves to the original list', async () => {
      expect(await PromiseUtils.each([1, 2], (n) => n * 100)).to.deep.equal([1, 2]);
    });

    it('rejects if the iterator rejects, and stops early', async () => {
      const seen = [];
      let err = null;
      await PromiseUtils.each([1, 2, 3], (n) => {
        if (n === 2) throw new Error('stop');
        seen.push(n);
      }).catch((e) => {
        err = e;
      });
      expect(err && err.message).to.equal('stop');
      expect(seen).to.deep.equal([1]);
    });
  });

  describe('props()', () => {
    it('resolves the values of an object', async () => {
      const out = await PromiseUtils.props({ a: Promise.resolve(1), b: 2 });
      expect(out).to.deep.equal({ a: 1, b: 2 });
    });

    it('rejects if any value rejects', async () => {
      let err = null;
      await PromiseUtils.props({ a: Promise.reject(new Error('nope')) }).catch((e) => {
        err = e;
      });
      expect(err && err.message).to.equal('nope');
    });
  });

  describe('onType()', () => {
    class AppError extends Error {}

    it('handles a matching error class', async () => {
      const out = await Promise.reject(new AppError('x')).catch(
        PromiseUtils.onType(AppError, () => 'handled'),
      );
      expect(out).to.equal('handled');
    });

    // The hazard the helper exists to prevent: swallowing unrelated errors.
    it('RETHROWS a non-matching error class', async () => {
      let err = null;
      await Promise.reject(new TypeError('passthrough'))
        .catch(PromiseUtils.onType(AppError, () => 'handled'))
        .catch((e) => {
          err = e;
        });
      expect(err).to.be.an.instanceof(TypeError);
      expect(err.message).to.equal('passthrough');
    });
  });

  describe('nodeify()', () => {
    it('is a no-op when no callback is given', async () => {
      expect(await PromiseUtils.nodeify(Promise.resolve(7))).to.equal(7);
    });

    it('calls back with (null, value) on success', async () => {
      const seen = await new Promise((resolve) => {
        PromiseUtils.nodeify(Promise.resolve(7), (err, value) => resolve([err, value]));
      });
      expect(seen).to.deep.equal([null, 7]);
    });

    it('calls back with the error on failure', async () => {
      const err = await new Promise((resolve) => {
        PromiseUtils.nodeify(Promise.reject(new Error('bad')), (e) => resolve(e));
      });
      expect(err.message).to.equal('bad');
    });
  });

  describe('withTimeout()', () => {
    it('passes a fast promise through', async () => {
      expect(await PromiseUtils.withTimeout(Promise.resolve('ok'), 1000)).to.equal('ok');
    });

    it('rejects with TimeoutError when too slow', async () => {
      let err = null;
      await PromiseUtils.withTimeout(PromiseUtils.delay(50), 5).catch((e) => {
        err = e;
      });
      expect(err).to.be.an.instanceof(PromiseUtils.TimeoutError);
    });
  });

  describe('delay()', () => {
    it('resolves with the value after the wait', async () => {
      expect(await PromiseUtils.delay(1, 'v')).to.equal('v');
    });
  });

  describe('defer()', () => {
    it('exposes resolve for an outside caller', async () => {
      const d = PromiseUtils.defer();
      setTimeout(() => d.resolve('later'), 1);
      expect(await d.promise).to.equal('later');
    });
  });
});
