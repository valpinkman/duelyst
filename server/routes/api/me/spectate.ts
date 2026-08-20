/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const _ = require('underscore');
const express = require('express');
const jwt = require('jsonwebtoken');
const knex = require('server/lib/data_access/knex');
const DataAccessHelpers = require('server/lib/data_access/helpers');
const FirebasePromises = require('server/lib/firebase_promises');
const DuelystFirebase = require('server/lib/duelyst_firebase_module');
const Logger = require('app/common/logger');
const Errors = require('server/lib/custom_errors');
const config = require('config/config');
const t = require('tcomb-validation');
const types = require('server/validators/types');
const Consul = require('server/lib/consul');
const Promise = require('bluebird');
const { onType } = require('../../../../app/common/utils/utils_promise');

const router = express.Router();

// router.get "/token", (req, res, next) ->
//   user_id = req.user.d.id
//
//   return knex("users").first('username').where('id',user_id)
//   .bind {}
//   .then (userRow) -> @.username = userRow.username
//   .then () -> DuelystFirebase.connect().getRootRef()
//   .then (rootRef) ->
//     return FirebasePromises.once(rootRef.child("users").child(user_id).child("buddies"),"value")
//   .then (snapshot) ->
//     buddies = snapshot.val()
//     buddyIds = _.keys(buddies)
//
//     payload =
//       b: buddyIds
//       u: @.username
//       iat: Math.floor(new Date().getTime() / 1000)
//
//     options =
//       expiresIn: 30
//       algorithm: 'HS256'
//
//     # We are encoding the payload inside the token
//     token = jwt.sign(payload, config.get('firebase.legacyToken'), options)
//     res.status(200).json(token)
//
//   .catch (error) -> next(error)

router.get('/:player_id', function (req, res, next) {
  const result = t.validate(req.params.player_id, types.UserId);
  if (!result.isValid()) {
    return next();
  }

  const user_id = req.user.d.id;
  const player_id = result.value;

  let systemStatusPromise = Promise.resolve({
    spectate: {
      enabled: true,
    },
  });

  if (config.get('consul.enabled')) {
    systemStatusPromise = Consul.kv.get(`environments/${process.env.NODE_ENV}/runtime-system-configuration.json`)
      .then(JSON.parse);
  }

  return systemStatusPromise
    .bind({})
    .then(function (consulSystemRuntimeParams) {
      if (!__guard__(consulSystemRuntimeParams != null ? consulSystemRuntimeParams.spectate : undefined, (x) => x.enabled)) {
        throw new Errors.SystemDisabledError('The spectate system is temporarily disabled.');
      }
    }).then(() => knex('users').first('username').where('id', user_id))
    .then(function (userRow) { return this.username = userRow.username; })
    .then(() => knex('users').first('username').where('id', player_id))
    .then(function (userRow) { return this.buddyName = userRow.buddyName; })
    .then(() => knex('user_games').where('user_id', player_id).orderBy('created_at', 'desc').first())
    .then(function (gameRow) {
      if (gameRow.ended_at != null) {
        throw new Errors.NotFoundError('The player\'s last game is over.');
      } else {
        return this.gameRow = gameRow;
      }
    })
    .then(() => DuelystFirebase.connect().getRootRef())
    .then((rootRef) => Promise.all([
      FirebasePromises.once(rootRef.child('users').child(user_id).child('buddies'), 'value'),
      FirebasePromises.once(rootRef.child('users').child(player_id).child('blockSpectators'), 'value'),
    ]))
    .then(function ([buddiesSnapshot, blockSpectatorsSnapshot]) {
      const buddies = buddiesSnapshot.val();
      const buddyIds = _.keys(buddies);

      if (blockSpectatorsSnapshot.val()) {
        throw new Errors.UnauthorizedError('This user has blocked spectators.');
      }

      if (!_.contains(buddyIds, player_id)) {
        throw new Errors.NotFoundError(`You must be buddies with ${this.buddyName} to spectate this game.`);
      }

      const payload = {
        b: buddyIds,
        u: this.username,
        iat: Math.floor(new Date().getTime() / 1000),
      };

      const options = {
        expiresIn: 30,
        algorithm: 'HS256',
      };

      // We are encoding the payload inside the token
      return this.token = jwt.sign(payload, config.get('firebase.legacyToken'), options);
    })
    .then(function () {
      const responseData = {
        gameData: DataAccessHelpers.restifyData(this.gameRow),
        token: this.token,
      };
      return res.status(200).json(responseData);
    })
    .catch(onType(Errors.UnauthorizedError, (error) => res.status(500).json({ message: error.message })))
    .catch(onType(Errors.SystemDisabledError, (error) => res.status(400).json({ message: error.message })))
    .catch((error) => next(error));
});

module.exports = router;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
