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
