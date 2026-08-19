/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/*
Starts main application
*/
const os = require('os');
const fs = require('fs');
const path = require('path');
const downloadHtml = require('./lib/download_html');
const mkdirp = require('mkdirp');
const Promise = require('bluebird');
const Logger = require('../app/common/logger');
const shutdownLib = require('./shutdown');

// Setup http server and express app
const app = require('./express');
const server = require('http').createServer(app);

// Configuration object
const config = require('../config/config.js');

const env = config.get('env');
const cdnDomain = config.get('aws.cdnDomainName');
const cdnUrl = `https://${cdnDomain}/${env}`;
const apiPort = config.get('port');

if (config.isDevelopment()) {
  Logger.module('SERVER').log('DEV MODE: enabling long stack support');
  process.env.BLUEBIRD_DEBUG = 1;
  Promise.longStackTraces();
}

// Methods to download assets from S3
// TODO : Put in module
const makeDirectory = function (cb) {
  const pubDir = `${__dirname}/../public/${env}`;
  Logger.module('API').warn(`Creating directory ${pubDir}`);
  return mkdirp(pubDir, function (err) {
    if (err != null) {
      Logger.module('API').error(`Failed to create directory ${pubDir}: ${err}`);
      return cb(err);
    } else {
      return cb(null);
    }
  });
};

const downloadIndexHtml = (url, cb) => downloadHtml(`${url}/index.html`, `${__dirname}/../public/${env}/index.html`, cb);

const downloadRegisterHtml = (url, cb) => downloadHtml(`${url}/register.html`, `${__dirname}/../public/${env}/register.html`, cb);

const setupDevelopment = () => server.listen(apiPort, function () {
  server.connected = true;
  return Logger.module('SERVER').log(`Duelyst '${env}' started on port ${apiPort}`);
});

const setupProduction = () => makeDirectory(function (err) {
  if (err != null) {
    Logger.module('SERVER').error(`setupDirectory() failed; exiting: ${err}`);
    return process.exit(1);
  } else {
    // FIXME: register.html is not currently in the build.
    downloadRegisterHtml(cdnUrl, function (err) {
      if (err != null) {
        return Logger.module('SERVER').warn(`downloadRegisterHtml() failed: ${err}`);
      }
    });
    return downloadIndexHtml(cdnUrl, function (err) {
      if (err != null) {
        Logger.module('SERVER').error(`downloadIndexHtml() failed; exiting: ${err}`);
        return process.exit(1);
      } else {
        return server.listen(apiPort, function () {
          server.connected = true;
          return Logger.module('SERVER').log(`Duelyst '${env}' started on port ${apiPort}`);
        });
      }
    });
  }
});

process.on('uncaughtException', (err) => shutdownLib.errorShutdown(err));

if (config.isDevelopment()) {
  setupDevelopment();
} else {
  setupProduction();
}
