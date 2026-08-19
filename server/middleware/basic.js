/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
let corsOptions,
  parser;
const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const colors = require('colors');
const {
  compose,
} = require('compose-middleware');
const Logger = require('app/common/logger');
const config = require('config/config');
const getRealIp = require('express-real-ip');

// Request logger, gets request logstream from Morgan and sends to console
const requestLogger = function (message) {
  // Strip newline
  if (config.get('expressLoggingEnabled')) {
    return Logger.module('EXPRESS').log(message.replace(/[\n]/g, ''));
  }
};

if (config.isDevelopment() || config.isStaging()) {
  parser = bodyParser.json({ limit: '10mb' });
} else {
  parser = bodyParser.json();
}

// Configure CORS.
if (config.isDevelopment()) {
  corsOptions = { origin: '*' }; // Allow any origin.
} else {
  const cdnDomain = config.get('aws.cdnDomainName');
  if (cdnDomain) {
    corsOptions = { origin: `https://${cdnDomain}` }; // Allow CORS to CDN.
  } else {
    corsOptions = {}; // Same-Origin only.
  }
}

module.exports = compose([
  getRealIp(),
  // Enable CORS
  cors(corsOptions),
  // Disable client cache headers
  helmet.noCache(),
  // Security headers
  helmet.xssFilter(),
  // Body parser and urlencoded
  parser,
  bodyParser.urlencoded({ extended: true }),
  // apache log format
  morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"', { stream: { write: requestLogger } }),
]);
