const Errors = require('../lib/custom_errors');

// catch all middleware
// turns any request not handled by our routes into a 404
module.exports = (req, res, next) => next(new Errors.NotFoundError());
