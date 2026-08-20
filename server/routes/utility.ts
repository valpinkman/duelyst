/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const express = require('express');

const router = express.Router();

const util = require('util');
// AWS = require "aws-sdk"
const fs = require('fs');
const hbs = require('hbs');

const { handlebars } = hbs;
const moment = require('moment');

const generatePushId = require('../../app/common/generate_push_id');

// lib Modules
const isSignedIn = require('../middleware/signed_in');
const Logger = require('../../app/common/logger');
const Errors = require('../lib/custom_errors');

// Configuration object
const config = require('../../config/config.js');

// set up AWS
// AWS.config.update
//  accessKeyId: config.get("s3_client_logs.key")
//  secretAccessKey: config.get("s3_client_logs.secret")
// s3 = new AWS.S3()
// Promise.promisifyAll(s3)

// async promise to get client template
const loadClientLogsHandlebarsTemplateAsync = new Promise(function (resolve, reject) {
  const readFile = require('util').promisify(require('fs').readFile);
  return readFile(__dirname + '/../templates/client-logs.hbs')
    .then(function (template) {
      const hbs_template = handlebars.compile(template.toString());
      return resolve(hbs_template);
    })
    .catch((err) => reject(err));
});

// # Require authentication
router.use('/utility', isSignedIn);

// Unused handler to facilitate uploading logs to S3.
// Stub the handler so we can remove the AWS SDK dependency.
router.post(
  '/utility/client_logs',
  (req, res, next) =>
    res.status(403).json({
      status: 'error',
      code: 403,
      message: 'This endpoint is deprecated.',
    }),
  /*
  user_id = req.user.d.id
  log_id = "#{moment().utc().format("YYYY-MM-DD---hh-mm-ss")}.#{uuid.v4()}"

  bucket = config.get("s3_client_logs.bucket")
  env = config.get("env")
  filename = env + "/#{user_id}/#{log_id}.html"
  url = "https://s3.#{config.get('aws.region')}.amazonaws.com/" + bucket + "/" + filename

  loadClientLogsHandlebarsTemplateAsync.then (template) ->
    * render client log as HTML
    html = template(req.body)

    * upload parameters
    params =
      Bucket: bucket
      Key: filename
      Body: html
      ACL:'public-read'
      ContentType:'text/html'

    return s3.putObjectAsync(params)
  .then () ->
    Logger.module("EXPRESS").debug "User #{user_id.blue} Client Logs Submitted to: #{url}"
    res.status(200).json({ logs_url: url })
  .catch (err) ->
    Logger.module("EXPRESS").error "ERROR UPLOADING #{user_id.blue} CLIENT LOGS to #{url} : #{err.message}".red
    next(err)
  */
);

module.exports = router;
