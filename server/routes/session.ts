/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const express = require('express');

const router = express.Router();

const util = require('util');
const Logger = require('../../app/common/logger');
const generatePushId = require('../../app/common/generate_push_id');
const _ = require('underscore');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const DuelystFirebase = require('../lib/duelyst_firebase_module');
const Promise = require('bluebird');
const moment = require('moment');
const hashHelpers = require('../lib/hash_helpers');
const DataAccessHelpers = require('../lib/data_access/helpers');
const Errors = require('../lib/custom_errors');
const isSignedIn = require('../middleware/signed_in');
const t = require('tcomb-validation');
const validators = require('../validators');
const types = require('../validators/types');
const fetch = require('isomorphic-fetch');
const formurlencoded = require('form-urlencoded');
const knex = require('../lib/data_access/knex');

// our modules
const UsersModule = require('../lib/data_access/users');
const ReferralsModule = require('../lib/data_access/referrals');
const InventoryModule = require('../lib/data_access/inventory');
const SyncModule = require('../lib/data_access/sync');
const AnalyticsUtil = require('../../app/common/analyticsUtil');

// Configuration object
const config = require('../../config/config');
const { version } = require('../../version');
const { onType } = require('../../app/common/utils/utils_promise');

/*
Build analytics data from user data
*/
const analyticsDataFromUserData = function (userRow) {
  const analyticsData = {};
  if (userRow.campaign_source != null) {
    analyticsData.campaign_source = userRow.campaign_source;
  }
  if (userRow.campaign_medium != null) {
    analyticsData.campaign_medium = userRow.campaign_medium;
  }
  if (userRow.campaign_term != null) {
    analyticsData.campaign_term = userRow.campaign_term;
  }
  if (userRow.campaign_content != null) {
    analyticsData.campaign_content = userRow.campaign_content;
  }
  if (userRow.campaign_name != null) {
    analyticsData.campaign_name = userRow.campaign_name;
  }
  if (userRow.referrer != null) {
    analyticsData.referrer = userRow.referrer;
  }
  if (userRow.first_purchased_at != null) {
    analyticsData.first_purchased_at = userRow.first_purchased_at;
  }
  if (userRow.seen_on_days != null) {
    AnalyticsUtil.convertDaysSeenOnFromArrayToObject(userRow.seen_on_days, analyticsData);
  }
  if (userRow.last_session_at != null) {
    analyticsData.last_session_at = userRow.last_session_at;
  }
  return analyticsData;
};

/*
 * Mint the Firebase custom token the client signs in with (plan 9.1 -> 9.4).
 *
 * This was non-fatal while nothing consumed it. Since 9.3 the client
 * authenticates to Firebase with this token and cannot read any of its own
 * data without it, so swallowing a failure here would hand back a session
 * that silently cannot talk to Firebase. Failing the login is the honest
 * outcome, and the error is logged with the user id for diagnosis.
 */
const mintFirebaseCustomToken = (id, username) => DuelystFirebase
  .createCustomToken(id, { username: username || null })
  .catch((e) => {
    Logger.module('SESSION').error(`failed to mint firebase custom token for ${id}: ${e.message}`);
    throw e;
  });

/*
Log a user in (firing sync jobs) and generate a response (token)
Possibly add param in return data to say username is null? OR just allow client to decode token
*/
const logUserIn = (id) => UsersModule.userDataForId(id)
  .bind({})
  .then(function (data) {
    if ((data == null)) {
      throw new Errors.NotFoundError();
    }

    if (data.is_suspended) {
      throw new Errors.AccountDisabled(`This account has been suspended. Reason: ${data.suspended_memo}`);
    }

    const payload = {
      d: {
        id,
        username: data.username || null,
      },
      v: 0,
      iat: Math.floor(new Date().getTime() / 1000),
    };
    const options = {
      expiresIn: config.get('jwt.tokenExpiration'),
      algorithm: 'HS256',
    };

    this.token = jwt.sign(payload, config.get('firebase.legacyToken'), options);
    this.analyticsData = analyticsDataFromUserData(data);
    return mintFirebaseCustomToken(id, data.username)
      .then((firebaseToken) => {
        this.firebaseToken = firebaseToken;
        return UsersModule.bumpSessionCountAndSyncDataIfNeeded(id, data);
      });
  }).then(function (synced) {
    this.synced = synced;
    return UsersModule.createDaysSeenOnJob(id);
  })
  .then(function () {
    return {
      token: this.token,
      // additive in 9.1; the client ignores it until 9.3
      firebase_token: this.firebaseToken,
      synced: this.synced,
      analytics_data: this.analyticsData,
    };
  });

/*
GET handler for session status
Validates current session used by user
Generates a fresh token by logging the user in
*/
router.get('/session/', isSignedIn, function (req, res, next) {
  const user_id = req.user.d.id;

  return logUserIn(user_id)
    .bind({})
    .then((data) => res.status(200).json(data)).catch(onType(Errors.NotFoundError, (e) => res.status(401).json({})))
    .catch(onType(Errors.AccountDisabled, (e) => res.status(401).json({ message: e.message })))
    .catch((e) => next(e));
});

/*
POST handler for session login
Log users in
*/
router.post('/session/', function (req, res, next) {
  const result = t.validate(req.body, validators.loginInput);
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const username = result.value.username != null ? result.value.username.toLowerCase() : undefined;
  const {
    password,
  } = result.value;

  return UsersModule.userIdForUsername(username)
    .bind({})
    .then(function (id) { // Step 2 : check if user exists
      if (!id) {
        throw new Errors.NotFoundError();
      }

      this.id = id;
      return UsersModule.userDataForId(id);
    }).then(function (data) { // check password valid
      this.userRow = data;
      if (data.is_suspended) {
        throw new Errors.AccountDisabled(`This account has been suspended. Reason: ${data.suspended_memo}`);
      }
      return hashHelpers.comparePassword(password, data.password);
    })
    .then(function (match) {
      if (!match) {
        throw new Errors.BadPasswordError();
      } else {
      // Firebase expects payload with following items:
      // d: profile data encoded in token, becomes accessible by Firebase security rules
      // v: version number (0)
      // iat : issued at time in seconds since epoch
        const payload = {
          d: {
            id: this.id,
            username: this.userRow.username,
          },
          v: 0,
          iat: Math.floor(new Date().getTime() / 1000),
        };

        // Token creation options are :
        // algorithm (default: HS256)
        // expiresInMinutes
        // audience
        // subject
        // issuer
        const options = {
          expiresIn: config.get('jwt.tokenExpiration'),
          algorithm: 'HS256',
        };

        // We are encoding the payload inside the token
        this.token = jwt.sign(payload, config.get('firebase.legacyToken'), options);

        // make a db transaction/ledger event for the login
        // UsersModule.logEvent(@id,"session","login")

        return mintFirebaseCustomToken(this.id, this.userRow && this.userRow.username)
          .then((firebaseToken) => {
            this.firebaseToken = firebaseToken;
            return UsersModule.bumpSessionCountAndSyncDataIfNeeded(this.id, this.userRow);
          });
      }
    })
    .then(function () {
      return UsersModule.createDaysSeenOnJob(this.id);
    })
    .then(function () {
      const analyticsData = analyticsDataFromUserData(this.userRow);
      // Send token
      // firebase_token is additive in 9.1; the client ignores it until 9.3
      return res.status(200).json({ token: this.token, firebase_token: this.firebaseToken, analytics_data: analyticsData });
    })
    .catch(onType(Errors.AccountDisabled, (e) => res.status(401).json({ message: e.message })))
    .catch(onType(Errors.NotFoundError, (e) => res.status(401).json({ message: 'Invalid Username or Password' })))
    .catch(onType(Errors.BadPasswordError, (e) => res.status(401).json({ message: 'Invalid Username or Password' })))
    .catch((e) => next(e));
});

/*
POST handler for registration
Register new users
*/
router.post('/session/register', function (req, res, next) {
  const result = t.validate(req.body, validators.signupInput);
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const {
    password,
  } = result.value;
  const username = result.value.username.toLowerCase();
  const inviteCode = result.value.keycode != null ? result.value.keycode.trim() : undefined;
  const referralCode = result.value.referral_code != null ? result.value.referral_code.trim() : undefined;
  const friendReferralCode = result.value.friend_referral_code != null ? result.value.friend_referral_code.trim() : undefined;
  const campaignData = result.value.campaign_data;
  const {
    captcha,
  } = result.value;
  const registrationSource = result.value.is_desktop ? 'desktop' : 'web';

  return UsersModule.isValidInviteCode(inviteCode)
    .bind({})
    .then(function (inviteCodeData) { // captcha verification
      if ((captcha != null) && config.get('recaptcha.secret')) {
        return Promise.resolve(
          fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formurlencoded({
              secret: config.get('recaptcha.secret'),
              response: captcha,
            }),
          }),
        )
          .bind(this)
          .timeout(10000)
          .then(function (res) {
            if (res.ok) {
              return res.json();
            } else {
              throw new Errors.UnverifiedCaptchaError('We could not verify the captcha (bot detection).');
            }
          })
          .then((body) => Promise.resolve(body.success));
      } else if (config.get('recaptcha.enabled') === false) {
        return true;
      } else {
        return false;
      }
    }).then(function (isCaptchaVerified) {
      if (!isCaptchaVerified) {
        throw new Errors.UnverifiedCaptchaError('We could not verify the captcha (bot detection).');
      }
      return UsersModule.createNewUser(username, password, inviteCode, referralCode, campaignData, registrationSource);
    })
    .then(function (userId) {
    // if we have a friend referral code just fire off async the job to link these two together
      if (friendReferralCode != null) {
        UsersModule.userIdForUsername(friendReferralCode)
          .then(function (referrerId) {
            if ((referrerId == null)) {
              throw new Errors.NotFoundError('Referrer not found by username.');
            }
            return ReferralsModule.markUserAsReferredByFriend(userId, referrerId);
          }).catch((err) => Logger.module('Session').error(`failed to mark ${userId} as referred by ${friendReferralCode}. error:${err.message}`.red));
      }
      // notify twitch alerts of conversion
      if ((campaignData != null ? campaignData.campaign_id : undefined) && ((campaignData != null ? campaignData.campaign_medium : undefined) === 'openpromotion')) {
        Logger.module('Session').debug(`twitch-alerts conversion. pinging: https://promos.twitchalerts.com/webhook/conversion?advertiser_id=34&code=${campaignData.campaign_source}&ip=${req.ip}&api_key=...&campaign_id=${campaignData.campaign_id}`);
        Promise.resolve(fetch(`https://promos.twitchalerts.com/webhook/conversion?advertiser_id=34&code=${campaignData.campaign_source}&ip=${req.ip}&api_key=2d82e8c0cf17467490467b0c77c6c08e&campaign_id=${campaignData.campaign_id}`))
          .timeout(10000)
          .then((res) => res.json()).then((body) => Logger.module('Session').debug('twitch-alerts response: ', body))
          .catch((e) => Logger.module('Session').error(`twitch-alerts error processing: ${e.message}`));
      }
      // respond back to client
      return res.status(200).json({});
    })
    .catch(onType(Errors.InvalidInviteCodeError, function (e) { // Specific error if the invite code is invalid
      Logger.module('Session').error(`can not register because invite code ${(inviteCode != null ? inviteCode.yellow : undefined)} is invalid`.red);
      return res.status(400).json(e);
    }))
    .catch(onType(Errors.InvalidReferralCodeError, function (e) { // Specific error if the invite code is invalid
      Logger.module('Session').error(`can not register because referral code ${(referralCode != null ? referralCode.yellow : undefined)} is invalid`.red);
      return res.status(400).json(e);
    }))
    .catch(onType(Errors.AlreadyExistsError, function (e) { // Specific error if the user already exists
      Logger.module('Session').error(`can not register because username ${(username != null ? username.blue : undefined)} already exists`.red);
      return res.status(401).json(e);
    }))
    .catch(onType(Errors.UnverifiedCaptchaError, function (e) { // Specific error if the captcha fails
      Logger.module('Session').error(`can not register because captcha ${captcha} input is invalid`.red);
      return res.status(401).json(e);
    }))
    .catch((e) => next(e));
});

/*
POST handler for checking availability of username
*/
router.post('/session/username_available', function (req, res, next) {
  const result = t.validate(req.body.username, types.Username);
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const username = result.value.toLowerCase();

  return UsersModule.userIdForUsername(username)
    .then(function (id) {
      if (id) {
        throw new Errors.AlreadyExistsError('Username already exists');
      } else {
        return res.status(200).json({});
      }
    }).catch(onType(Errors.AlreadyExistsError, (e) => res.status(401).json(e))).catch((e) => next(e));
});

/*
POST handler for changing a username
*/
router.post('/session/change_username', isSignedIn, function (req, res, next) {
  const user_id = req.user.d.id;
  const result = t.validate(req.body.new_username, types.Username);
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const new_username = result.value.toLowerCase();

  return UsersModule.changeUsername(user_id, new_username)
    .then(() => res.status(200).json({})).catch(onType(Errors.AlreadyExistsError, function (e) { // Specific error if the username already exists
      Logger.module('Session').error(`can not change username to ${new_username.blue} as it already exists`.red);
      return res.status(400).json(e);
    })).catch(onType(Errors.InsufficientFundsError, function (e) {
      Logger.module('Session').error(`can not change username to ${new_username.blue} due to insufficient funds`.red);
      return res.status(400).json(e);
    }))
    .catch((e) => next(e));
});

/*
POST handler for changing a password
*/
router.post('/session/change_password', isSignedIn, function (req, res, next) {
  const user_id = req.user.d.id;
  const result = t.validate(req.body, validators.changePasswordInput);
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const {
    current_password,
  } = result.value;
  const {
    new_password,
  } = result.value;

  return UsersModule.changePassword(user_id, current_password, new_password)
    .then(() => res.status(200).json({ message: 'OK - password changed' })).catch(onType(Errors.BadPasswordError, (e) => res.status(401).json({}))).catch((e) => next(e));
});

/*
GET handler for session logout
Invalidates current session used by user
*/
router.get('/session/logout', isSignedIn, (req, res) => res.status(200).json({ authenticated: false }));

module.exports = router;
