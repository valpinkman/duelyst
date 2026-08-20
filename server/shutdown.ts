/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const os = require('os');
const Logger = require('../app/common/logger');

// Configuration object
const config = require('../config/config.js');

/**
 * Shutdown server process with an unhandled error
 * @public errorShutdown
 * @param {Error} err
 */
module.exports.errorShutdown = function (err) {
  Logger.module('SHUTDOWN').error(err.stack);
  return process.exit(1);
};
