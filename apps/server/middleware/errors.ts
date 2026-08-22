/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/*
 * Middleware for dealing with server errors
 * Should be included in app.use last
 */
const Logger = require('@duelyst/common/logger');
const config = require('config/config');

// first error middleware: internal console.logger
// prints errors to console with pretty print stacktrace
module.exports.logError = function (err, req, res, next) {
  // ensure err.status is set
  err.status = err.status || 500;

  // don't log 4xx outside of localdev
  if (config.get('env') !== 'development' && err.status >= 400 && err.status <= 500) {
    return next(err);
  }

  // log errors and stack traces
  Logger.module('EXPRESS').log(`ERROR: ${err.status} ${err.message} for client ${req.ip}`);
  Logger.module('EXPRESS').log(err.stack);
  return next(err);
};

// last error middleware: either development or production
// ends the request and sends the error back by HTML or JSON

// development prints full stack trace and does not modify error message
module.exports.development = function (err, req, res, next) {
  // ensure err.status is set
  err.status = err.status || 500;
  res.status(err.status);
  return res.format({
    'text/html'() {
      return res.render(__dirname + '/../templates/error.hbs', {
        title: err.status + ' - ' + err.message,
        description: err.description,
        stack: err.stack,
      });
    },
    'application/json'() {
      return res.json({ error: err.message });
    },
  });
};

// production sets a default error message and scrubs stacktrace
module.exports.production = function (err, req, res, next) {
  const error: Record<string, any> = {};

  // check for 400,401,404, otherwise we have 500 error
  // we scrub the error to a default msg
  if (err.status === 400 || err.status === 401 || err.status === 404) {
    error.status = err.status;
    error.message = err.message;
    error.description = err.description;
  } else {
    error.status = 500;
    error.message = 'Internal Server Error.';
    error.description = "Sorry, we've experienced an error.";
  }

  res.status(error.status);
  return res.format({
    'text/html'() {
      return res.render(__dirname + '/../templates/error.hbs', {
        title: error.message,
        description: error.description,
      });
    },
    'application/json'() {
      return res.json({ error: error.message });
    },
  });
};
