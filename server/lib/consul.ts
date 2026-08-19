/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const os = require('os');
const config = require('../../config/config.js');
const Logger = require('../../app/common/logger');
const Colors = require('colors');
const Promise = require('bluebird');
const request = require('superagent');
const _ = require('underscore');

class Consul {
  declare static baseUrl: any;
  declare static kvUrl: any;
  declare static gameServiceHealthUrl: any;
  declare static aiServiceHealthUrl: any;
  declare static kv: any;

  static getHealthyServers(callback) {
    return new Promise((resolve, reject) => request.get(this.gameServiceHealthUrl).end(function (err, res) {
      if ((res != null) && (res.status >= 400)) {
        // Network failure, we should probably return a more intuitive error object
        Logger.module('CONSUL').debug(`ERROR! Failed to connect to Consul, get(${this.gameServiceHealthUrl}) failed: ${res.status} `.red);
        return reject(new Error('Failed to connect to Consul.'));
      } else if (err) {
        // Internal failure
        Logger.module('CONSUL').debug(`ERROR! getHealthyServers() failed: ${err.message} `.red);
        return reject(err);
      } else {
        Logger.module('CONSUL').debug('getHealthyServers()'.green);
        return resolve(res.body);
      }
    })).nodeify(callback);
  }

  static getHealthySinglePlayerServers(callback) {
    return new Promise((resolve, reject) => request.get(this.aiServiceHealthUrl).end(function (err, res) {
      if ((res != null) && (res.status >= 400)) {
        // Network failure, we should probably return a more intuitive error object
        Logger.module('CONSUL').debug(`ERROR! Failed to connect to Consul, kv.get(${key}) failed: ${res.status} `.red);
        return reject(new Error('Failed to connect to Consul.'));
      } else if (err) {
        // Internal failure
        Logger.module('CONSUL').debug(`ERROR! getHealthySinglePlayerServers() failed: ${err.message} `.red);
        return reject(err);
      } else {
        Logger.module('CONSUL').debug('getHealthySinglePlayerServers()'.green);
        return resolve(res.body);
      }
    })).nodeify(callback);
  }

  // Get whether or not this server should re-assign players on shutdown
  // Value is stored in Consul KV under /nodes tree
  // Note in most cases, this will default to true (even if no flag is found in Consul)
  static getReassignmentStatus(callback) {
    const nodename = os.hostname().split('.')[0];
    const key = `nodes/${config.get('env')}-${nodename}/reassignment-status`;
    const status = new Promise((resolve, reject) => request
      .get(this.kvUrl + key + '?raw')
      .accept('json')
      .end(function (err, res) {
        if (err) {
          // If there's an error, we still want to default true
          return resolve(true);
        }
        if (res.status >= 400) {
          // If no reassignment-status flag is found (ie 404), we want to default true
          return resolve(true);
        }
        return resolve(res.text);
      }));

    // Parse the reassignment-status result, note JSON.parse(true) = true
    // Value in Consul looks like {"enabled":true}
    return status.then(JSON.parse).then(function (result) {
      if (result.enabled === false) {
        Logger.module('CONSUL').debug('getReassignmentStatus() == false'.red);
        return false;
      }
      Logger.module('CONSUL').debug('getReassignmentStatus() == true'.green);
      return true;
    }).nodeify(callback);
  }
}
Consul.baseUrl = `http://${config.get('consul.ip')}:${config.get('consul.port')}/v1/`;
Consul.kvUrl = Consul.baseUrl + 'kv/';
Consul.gameServiceHealthUrl = Consul.baseUrl + `health/service/${config.get('consul.gameServiceName')}?passing`;
Consul.aiServiceHealthUrl = Consul.baseUrl + `health/service/${process.env.NODE_ENV}-ai?passing`;
Consul.kv = {
  get: (key, callback) => new Promise((resolve, reject) =>
  // Make 'raw' request to Consul which returns the value directly (not encoded)
  // Without 'raw', the value will be base64 encoded, you can decode with:
  // decoded = new Buffer(value, 'base64').toString()
    request.get(Consul.kvUrl + key + '?raw').end(function (err, res) {
      if ((res != null) && (res.status >= 400)) {
        // Network failure, we should probably return a more intuitive error object
        Logger.module('CONSUL').debug(`ERROR! Failed to connect to Consul, kv.get(${key}) failed: ${res.status} `.red);
        return reject(new Error('Failed to connect to Consul.'));
      } else if (err) {
        // Internal failure
        Logger.module('CONSUL').debug(`ERROR! kv.get(${key}) failed: ${err.message} `.red);
        return reject(err);
      } else {
        // Logger.module("CONSUL").log "kv.get(#{key}): #{res.text} ".green
        return resolve(res.text);
      }
    }),
  ).nodeify(callback),
};

module.exports = Consul;
