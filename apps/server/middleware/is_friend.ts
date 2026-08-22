/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const express = require('express');

const router = express.Router();
const { compose } = require('compose-middleware');
const config = require('config/config');
const DuelystFirebase = require('../lib/duelyst_firebase_module');
const FirebasePromises = require('../lib/firebase_promises');
const t = require('tcomb-validation');
const types = require('../validators/types');

/*
Make sure users routes have a User ID parameter
*/
module.exports = function (req, res, next) {
  const _chainState: Record<string, any> = {};
  const result = t.validate(req.params.user_id, types.UserId);
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const user_id = result.value;
  const requrester_id = req.user.d.id;

  // a user can read their own data
  if (user_id === requrester_id) {
    req.user_id = user_id;
    return next();
  }

  return DuelystFirebase.connect()
    .getRootRef()
    .then(function (fbRootRef) {
      _chainState.fbRootRef = fbRootRef;
      return FirebasePromises.once(
        _chainState.fbRootRef.child('users').child(requrester_id).child('buddies').child(user_id),
        'value',
      );
    })
    .then(function (snapshot) {
      if (snapshot.val() != null) {
        req.user_id = user_id;
        return next();
      } else {
        return res
          .status(401)
          .json({ message: "You are not authorized to view this player's data." });
      }
    });
};
