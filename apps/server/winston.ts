const util = require('util');
const winston = require('winston');
const config = require('@duelyst/config');

/*
 * Routes console.* through winston (plan 7.3, tier 2).
 *
 * Opt-in: `config.get('winston')` defaults to false and no environment file
 * turns it on, so nothing loads this unless WINSTON_ENABLE=true is set.
 *
 * The Papertrail transport that used to sit alongside the console one is gone.
 * It shipped every log line to logs.papertrailapp.com - Counterplay's log
 * aggregator, which went away with the shutdown - and it carried no
 * credentials, so it could only ever have failed. Its transport package
 * (winston-papertrail) is also unmaintained and winston-2 only, so it would
 * have blocked this upgrade regardless.
 */
const setup = function (systemName) {
  if (systemName == null) {
    systemName = 'n/a';
  }
  console.log(`CONFIGURING WINSTON LOGS for ${config.get('env')}`);

  /*
   * winston 3 replaced `new winston.Logger(...)` with `createLogger`, and
   * moved per-transport `colorize`/`prettyPrint` options into composable
   * formats set on the logger.
   */
  const logger = winston.createLogger({
    level: config.get('winston_level'),
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message }) => `${level}: ${message}`),
    ),
    transports: [new winston.transports.Console()],
  });

  /*
   * console.* takes any number of arguments and formats them the way
   * util.format does; winston 3 takes (message, meta) and would swallow every
   * argument after the first into metadata. Formatting here keeps the
   * overridden console.* behaving exactly like the real one.
   */
  const forward = (level) =>
    function (...args) {
      logger[level](util.format(...args));
    };

  console.log = forward('info');
  console.debug = forward('debug');
  console.warn = forward('warn');
  console.error = forward('error');

  // returned so callers (and the unit test) can attach transports; this path is
  // opt-in and nothing in CI runs it, so it needs a way to be asserted on
  return logger;
};

module.exports = {
  setup,
};
