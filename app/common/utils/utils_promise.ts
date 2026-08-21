/*
 * Promise helpers replacing the bluebird idioms this codebase relied on
 * (MODERNIZATION_PLAN.md 7.3, bluebird removal).
 */

/**
 * Replacement for bluebird's typed catch, `.catch(onType(SomeError, handler))`.
 *
 *   .catch(onType(Errors.NotFoundError, (e) => res.status(404).end()))
 *   .catch(onType(Errors.NotFoundError, (e) => res.status(404).end()))
 *
 * Native `.catch` cannot filter by error class, so the check moves inside.
 * The `throw err` is the entire point: without it, a `.catch` written to
 * handle one error class silently swallows every OTHER error too, turning
 * crashes into successful-looking responses. That is the single biggest
 * hazard in migrating off bluebird, and it is why this is a helper rather
 * than 76 hand-written `instanceof` blocks.
 */
exports.onType = function (ErrorClass, handler) {
  return function (err) {
    if (err instanceof ErrorClass) {
      return handler(err);
    }
    throw err;
  };
};

/**
 * Replacement for bluebird's `.timeout(ms)`.
 *
 *   somePromise.timeout(10000)
 *   withTimeout(somePromise, 10000)
 *
 * Rejects with a TimeoutError if the promise has not settled in time. The
 * error class is exported because callers catch it specifically - bluebird
 * exposed its own `Promise.TimeoutError`, and those call sites need something
 * to compare against.
 *
 * The timer is always cleared, including on the success path; leaving it
 * pending would keep the Node event loop alive.
 */
class TimeoutError extends Error {
  constructor(message) {
    super(message || 'operation timed out');
    this.name = 'TimeoutError';
  }
}
exports.TimeoutError = TimeoutError;

exports.withTimeout = function (promise, ms, message) {
  let timer;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

/**
 * Replacement for bluebird's `.delay(ms)`: pass the value through after a wait.
 */
exports.delay = function (ms, value) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });
};

/**
 * Replacement for `new Promise.defer()` - a promise plus its resolve/reject,
 * for the cases where those are called from somewhere else entirely.
 * Removed from bluebird 3 and never part of native promises, but the pattern
 * is genuinely needed where resolution is triggered by an unrelated event.
 */
exports.defer = function () {
  const d: Record<string, any> = {};
  d.promise = new Promise((resolve, reject) => {
    d.resolve = resolve;
    d.reject = reject;
  });
  return d;
};

/**
 * Replacement for bluebird's `.cancellable()` / `.cancel()`.
 *
 *   const p = cancellable(new Promise(...));
 *   p.cancel();   // rejects p with a CancellationError
 *
 * IMPORTANT DIFFERENCE: bluebird's cancel also tried to stop the underlying
 * operation. This does not - it only settles the promise. That is enough for
 * why this codebase cancels: a promise wrapped around a one-shot event
 * listener would otherwise never settle, and the chain waiting on it leaks.
 * Rejecting releases that chain, which is the behaviour the call sites rely on.
 *
 * `.cancel()` is attached to the returned promise so existing call sites -
 * `App._foundGamePromise.cancel()` - keep working unchanged.
 */
class CancellationError extends Error {
  constructor(message?) {
    super(message || 'operation cancelled');
    this.name = 'CancellationError';
  }
}
exports.CancellationError = CancellationError;

exports.cancellable = function (promise) {
  let cancel;
  const gate = new Promise((resolve, reject) => {
    cancel = () => reject(new CancellationError());
  });
  const raced: any = Promise.race([promise, gate]);
  raced.cancel = cancel;
  return raced;
};

/**
 * Replacement for bluebird's `.nodeify(callback)`.
 *
 *   somePromise.nodeify(cb)   ->   nodeify(somePromise, cb)
 *
 * Three behaviours that a naive `.then(v => cb(null, v), e => cb(e))` gets
 * wrong, and that broke the API when it was written that way:
 *
 *  1. WITHOUT a callback it is a NO-OP - bluebird returns the promise
 *     untouched. These functions take an optional callback so they can be used
 *     either way, so calling `cb` unconditionally throws
 *     "TypeError: callback is not a function" for every promise-style caller.
 *  2. WITH a callback, the promise's resolved value is unchanged; the callback
 *     is a side effect, not a transform.
 *  3. WITH a callback, a rejection is delivered to the callback and NOT
 *     re-thrown, otherwise every caller also gets an unhandled rejection.
 */
exports.nodeify = function (promise, callback) {
  if (typeof callback !== 'function') return promise;
  return promise.then(
    (value) => {
      callback(null, value);
      return value;
    },
    (err) => {
      callback(err);
    },
  );
};

/**
 * Replacement for bluebird's `Promise.map(items, mapper, {concurrency})`.
 *
 * NOT equivalent to `Promise.all(items.map(fn))`, which is why this is a
 * helper. bluebird's version:
 *   - accepts a promise for the list, and resolves promises *inside* it
 *     before handing each value to the mapper;
 *   - calls the mapper as `(item, index, length)`;
 *   - honours `{concurrency: n}`, and **`{concurrency: 1}` means serial**.
 *
 * That last point is load-bearing here rather than a performance knob:
 * `data_access/achievements.ts` runs its mapper with concurrency 1 precisely
 * "so that there's no chance of card log getting overwritten". Converting such
 * a site to `Promise.all` would run the writes concurrently and reintroduce
 * that overwrite bug with no test failure to show for it.
 */
exports.map = function (items, mapper, options) {
  const concurrency = options && options.concurrency > 0 ? options.concurrency : Infinity;
  return Promise.resolve(items).then((list) => {
    const arr = Array.from(list);
    const { length } = arr;
    const results = new Array(length);
    if (length === 0) return results;

    const limit = Math.min(concurrency, length);
    let next = 0;
    let completed = 0;
    let failed = false;

    return new Promise((resolve, reject) => {
      const launch = function () {
        while (next < length && !failed && next - completed < limit) {
          const i = next;
          next += 1;
          Promise.resolve(arr[i])
            .then((item) => mapper(item, i, length))
            .then(
              (value) => {
                results[i] = value;
                completed += 1;
                if (completed === length) {
                  resolve(results);
                } else {
                  launch();
                }
              },
              (err) => {
                failed = true;
                reject(err);
              },
            );
        }
      };
      launch();
    });
  });
};

/**
 * Replacement for bluebird's `Promise.each(items, iterator)`: always serial,
 * and resolves to the ORIGINAL list rather than the iterator's return values
 * (that is bluebird's contract, and callers rely on it).
 */
exports.each = function (items, iterator) {
  return Promise.resolve(items).then((list) => {
    const arr = Array.from(list);
    let chain = Promise.resolve();
    arr.forEach((item, i) => {
      chain = chain.then(() => item).then((value) => iterator(value, i, arr.length));
    });
    return chain.then(() => arr);
  });
};

/**
 * Replacement for bluebird's `Promise.props(obj)`: `Promise.all` for the
 * values of an object, resolving to an object with the same keys.
 */
exports.props = function (obj) {
  return Promise.resolve(obj).then((o) => {
    const keys = Object.keys(o);
    return Promise.all(keys.map((k) => o[k])).then((values) => {
      const out = {};
      keys.forEach((k, i) => {
        out[k] = values[i];
      });
      return out;
    });
  });
};

/**
 * Replacement for bluebird's synchronous promise INSPECTION api
 * (`p.isFulfilled()` / `isPending()` / `isRejected()`), which native promises
 * do not have at all.
 *
 * This is easy to miss when dropping bluebird, because the calls do not look
 * like promise combinators and nothing flags them: lint cannot see it,
 * typecheck does not gate, and the failure is a TypeError thrown deep inside a
 * UI transition. In this codebase that surfaced as
 * "this._contentOnlyPromise.isFulfilled is not a function", which hung the
 * login -> registration transition with the app otherwise looking healthy.
 *
 * Note the one behavioural difference from bluebird: the flag flips in a
 * microtask after the underlying promise settles, not synchronously with it.
 * Every call site here is a UI guard ("is this transition still running?"),
 * where a one-tick delay is not observable.
 */
exports.inspectable = function (promise?) {
  if (promise == null) return promise;
  if (typeof promise.isFulfilled === 'function') return promise; // already inspectable

  let state = 'pending';
  const tracked: any = Promise.resolve(promise).then(
    (value) => {
      state = 'fulfilled';
      return value;
    },
    (err) => {
      state = 'rejected';
      throw err;
    },
  );
  tracked.isFulfilled = () => state === 'fulfilled';
  tracked.isRejected = () => state === 'rejected';
  tracked.isPending = () => state === 'pending';
  return tracked;
};
