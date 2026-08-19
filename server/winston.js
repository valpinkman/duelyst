/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const os = require('os');
const winston = require('winston');
const {
  Papertrail,
} = require('winston-papertrail');
const config = require('../config/config.js');

const setup = function (systemName) {
  if (systemName == null) { systemName = 'n/a'; }
  console.log(`CONFIGURING WINSTON LOGS for ${config.get('env')}`);

  // Winston Logger setup
  const loggerTransports = [];

  // file log
  // loggerTransports.push(new (winston.transports.File)(filename: "server/server.log"))

  // console log
  loggerTransports.push(
    new (winston.transports.Console)({
      level: config.get('winston_level'),
      colorize: true,
    }),
  );

  // papertrail log
  loggerTransports.push(
    new Papertrail({
      host: 'logs.papertrailapp.com',
      port: 32677,
      program: `${config.get('env')}-${systemName}`,
      level: config.get('winston_level'),
      colorize: true,
      prettyPrint: true,
      timestamp: false,
      // Custom format to remove the log level from message
      logFormat(level, message) {
        return message;
      },
    }),
  );
  // Winston Logger create
  const logger = new (winston.Logger)({ transports: loggerTransports });

  // console.log override
  // TODO : need better override method ?
  console.log = function () {
    logger.info.apply(logger, arguments);
  };

  // console.log override
  // TODO : need better override method ?
  console.debug = function () {
    logger.debug.apply(logger, arguments);
  };

  // console.log override
  // TODO : need better override method ?
  console.warn = function () {
    logger.warn.apply(logger, arguments);
  };

  // console.log override
  // TODO : need better override method ?
  return console.error = function () {
    logger.error.apply(logger, arguments);
  };
};

module.exports = {
  setup,
};
