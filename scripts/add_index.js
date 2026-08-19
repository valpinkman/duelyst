/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Firebase = require('firebase');
const _ = require('underscore');

const fbUtil = require('../app/common/utils/utils_firebase');

// Configuration object
const config = require('../config/config');

// Firebase secure token for duelyst-dev.firebaseio.com
const firebaseToken = 'AxTA1RfsIzL2hDUOmYyFXQ9VAjnc86EqZ4n8LvxJ';
const fbRef = new Firebase('https://duelyst-alpha.firebaseio.com/');

// fbRef = new Firebase(config.get('firebase'))
fbRef.auth(firebaseToken, (error) => {
  if (error) {
    // Failed to connect to our secure user database
    console.log('Error authenticating against our database.');
    return process.exit(1);
  }
});

const fbAuthRef = new Firebase('https://duelyst-alpha-auth.firebaseio.com/');
const authToken = '3UyCSPCLvTBR7zSzUL4Z0hkJB1YcrXK86SNcB3pE';

// Our Firebase with auth data is read-only by admin so we authenticate
// auth is cached by Firebase for future requests
fbAuthRef.auth(authToken, (error) => {
  if (error) {
    // Failed to connect to our secure user database
    console.log('Error authenticating against our user database.');
    return process.exit(1);
  }
});

const getAllEmails = (cb) => fbAuthRef.child('user').once('value', (snapshot) => {
  const data = snapshot.val();
  const emails = {};
  for (const user in data) {
    const {
      email,
    } = data[user];
    emails[email] = user;
  }
  return cb(emails);
});

const createIndex = function (email, id) {
  const escapedEmail = fbUtil.escapeEmail(email);
  return fbRef.child('email-index').child(escapedEmail).set(id, (error) => {
    if (error) {
      return console(`Failed to set index for: ${email}`);
    }
    return console.log(`Index created for: ${email}`);
  });
};

getAllEmails((result) => _.map(result, (id, email) => createIndex(email, id)));
