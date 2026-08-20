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
  return new Promise((resolve) => { setTimeout(() => resolve(value), ms); });
};

/**
 * Replacement for `new Promise.defer()` - a promise plus its resolve/reject,
 * for the cases where those are called from somewhere else entirely.
 * Removed from bluebird 3 and never part of native promises, but the pattern
 * is genuinely needed where resolution is triggered by an unrelated event.
 */
exports.defer = function () {
  const d = {};
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
  constructor(message) {
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
  const raced = Promise.race([promise, gate]);
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
    (value) => { callback(null, value); return value; },
    (err) => { callback(err); },
  );
};
