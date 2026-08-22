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

const Logger = require('@duelyst/common/logger');
const config = require('../config/config.js');

// bluebird's promisifyAll gave us zlib.gzipAsync; node's promisify is the
// direct equivalent, and a real binding rather than a mutation of the module.
const gzipAsync = promisify(zlib.gzip);

// Validate config.
const env = config.get('env');
const awsRegion = config.get('aws.region');
const replaysBucket = config.get('aws.replaysBucketName');
const accessKeyId = config.get('aws.accessKey');
const secretAccessKey = config.get('aws.secretKey');

/*
 * Replay archiving is OPTIONAL. A self-hosted deployment has no bucket of its
 * own -- aws.replaysBucketName still defaults to Counterplay's `duelyst-games`
 * -- so uploading is off unless BOTH credentials are configured.
 *
 * This used to be unconditional, and it cost more than replays: the rejection
 * propagated out of the archive-game job before saveGameMetadata() ran, so no
 * finished game got its row in the `games` table. `game_data_json_url` is a
 * nullable column that nothing reads back (the replay routes rebuild the URL
 * from config), so returning null here is a supported value, not a stub.
 *
 * Note the credentials shape below: aws-sdk v3 takes a nested `credentials`
 * object. The v2 spelling -- accessKeyId/secretAccessKey at the top level --
 * survived the v2 -> v3 port and silently did nothing, which is why even the
 * development path could not authenticate.
 */
const isUploadEnabled = Boolean(awsRegion && replaysBucket && accessKeyId && secretAccessKey);

let s3Client = null;
if (isUploadEnabled) {
  Logger.module('REPLAYS').log(
    `Creating S3 client with Region ${awsRegion} and Bucket ${replaysBucket}`,
  );
  s3Client = new S3Client({
    region: awsRegion,
    credentials: { accessKeyId, secretAccessKey },
  });
} else {
  Logger.module('REPLAYS').log(
    'Replay archiving is disabled: set AWS_ACCESS_KEY, AWS_SECRET_KEY and S3_REPLAYS_BUCKET to enable it',
  );
}

// returns promise for s3 upload
// takes *serialized* game data
const upload = function (gameId, serializedGameSession, serializedMouseUIEventData) {
  if (!isUploadEnabled) {
    return Promise.resolve(null);
  }

  Logger.module('REPLAYS').log(`uploading game ${gameId} to S3`);

  const allDeflatePromises = [gzipAsync(serializedGameSession)];
  if (serializedMouseUIEventData != null) {
    allDeflatePromises.push(gzipAsync(serializedMouseUIEventData));
  }

  const filename = env + '/' + gameId + '.json';
  return Promise.all(allDeflatePromises)
    .then(function ([gzipGameSessionData, gzipMouseUIEventData]) {
      let cmd, params;
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
    })
    .then(function ([gameDataPutResp, mouseDataPutResp]) {
      Logger.module('REPLAYS').log(`Successfully uploaded game ${gameId}`);
      return `https://s3.${awsRegion}.amazonaws.com/` + replaysBucket + '/' + filename;
    })
    .catch(function (e) {
      Logger.module('REPLAYS').error(`Error: Failed to upload game ${gameId} to S3: ${e.message}`);
      throw e;
    });
};

module.exports = upload;
