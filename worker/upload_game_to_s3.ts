/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const _ = require('underscore');
const colors = require('colors');
const url = require('url');
const zlib = require('zlib');
const { promisify } = require('util');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const Logger = require('../app/common/logger');
const config = require('../config/config.js');

// bluebird's promisifyAll gave us zlib.gzipAsync; node's promisify is the
// direct equivalent, and a real binding rather than a mutation of the module.
const gzipAsync = promisify(zlib.gzip);

// Validate config.
const env = config.get('env');
const awsRegion = config.get('aws.region');
const replaysBucket = config.get('aws.replaysBucketName');
if (!awsRegion || !replaysBucket) {
  throw new Error('Error: Failed to initialize S3 uploader: aws.region and aws.replaysBucketName are required');
}

// Configure S3 access.
Logger.module('REPLAYS').log(`Creating S3 client with Region ${awsRegion} and Bucket ${replaysBucket}`);
const s3Opts = { region: awsRegion };
if (config.get('env') === 'development') {
  s3Opts.accessKeyId = config.get('aws.accessKey');
  s3Opts.secretAccessKey = config.get('aws.secretKey');
}
const s3Client = new S3Client(s3Opts);

// returns promise for s3 upload
// takes *serialized* game data
const upload = function (gameId, serializedGameSession, serializedMouseUIEventData) {
  Logger.module('REPLAYS').log(`uploading game ${gameId} to S3`);

  const allDeflatePromises = [gzipAsync(serializedGameSession)];
  if (serializedMouseUIEventData != null) {
    allDeflatePromises.push(gzipAsync(serializedMouseUIEventData));
  }

  const filename = env + '/' + gameId + '.json';
  return Promise.all(allDeflatePromises)
    .then(function ([gzipGameSessionData, gzipMouseUIEventData]) {
      let cmd,
        params;
      Logger.module('REPLAYS').log(`done compressing game ${gameId} for upload`);
      const allPromises = [];

      if (gzipGameSessionData != null) {
        params = {
          Bucket: replaysBucket,
          Key: filename,
          Body: gzipGameSessionData,
          ACL: 'public-read',
          ContentEncoding: 'gzip',
          ContentType: 'text/json',
        };
        cmd = new PutObjectCommand(params);
        allPromises.push(s3Client.send(cmd));
      }

      if (gzipMouseUIEventData != null) {
        params = {
          Bucket: replaysBucket,
          Key: env + '/ui_events/' + gameId + '.json',
          Body: gzipMouseUIEventData,
          ACL: 'public-read',
          ContentEncoding: 'gzip',
          ContentType: 'text/json',
        };
        cmd = new PutObjectCommand(params);
        allPromises.push(s3Client.send(cmd));
      }

      return Promise.all(allPromises);
    }).then(function ([gameDataPutResp, mouseDataPutResp]) {
      Logger.module('REPLAYS').log(`Successfully uploaded game ${gameId}`);
      return `https://s3.${awsRegion}.amazonaws.com/` + replaysBucket + '/' + filename;
    }).catch(function (e) {
      Logger.module('REPLAYS').error(`Error: Failed to upload game ${gameId} to S3: ${e.message}`);
      throw e;
    });
};

module.exports = upload;
