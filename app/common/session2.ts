/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const debug = require('debug')('session');
const { EventEmitter } = require('events');
const Promise = require('bluebird');
const Firebase = require('app/firebase');
const fetch = require('isomorphic-fetch');
const moment = require('moment');
const Storage = require('app/common/storage');
const i18next = require('i18next');

class Session extends EventEmitter {
  constructor(options) {
    if (options == null) { options = {}; }
    super();
    this.url = process.env.API_URL || options.url || 'http://localhost:5000';
    this.fbUrl = process.env.FIREBASE_URL || options.fbUrl || 'https://duelyst-development.firebaseio.com/';
    debug(`constructor: ${this.url} : ${this.fbUrl}`);
    // init props for reference
    this.fbRef = null;
    this.token = null;
    this.expires = null;
    this.userId = null;
    this.username = null;
    this.analyticsData = null;
    this.justRegistered = null;
    this._cachedPremiumBalance = null;
  }

  _checkResponse(res) {
    if (res.ok) {
      debug(`_checkResponse: ${res.status}`);
      return res.json()
        .then((data) => {
          data.status = res.status;
          return data;
        });
    }
    const err = new Error(res.statusText);
    err.status = res.status;
    if ((res.status === 400) || (res.status === 401)) {
      return res.json().then((data) => {
        err.innerMessage = data.codeMessage ? data.codeMessage : data.message;
        debug(`_checkResponse: ${res.status} : ${err.message} : ${err.innerMessage}`);
        this.emit('error', err);
        throw err;
      });
    }
    err.innerMessage = 'Please try again';
    debug(`_checkResponse: ${res.status} : ${err.message}`);
    this.emit('error', err);
    throw err;
  }

  _networkError(e) {
    debug(`_networkError: ${e.message}`);
    throw new Error('Please try again');
  }

  /*
   * Authenticate to Firebase with the custom token the API mints (plan 9.1).
   *
   * firebase 2.x took a JWT signed with the database secret and handed its
   * whole `d` payload to the rules as `auth`, which is why this used to be
   * given the SAME token we send to our API. From v3 on, sign-in takes a real
   * custom token and the rules see `auth.uid` plus `auth.token.*`.
   *
   * The `{ auth: { id, username }, expires }` shape is preserved because
   * callers read it; only where the values come from has changed.
   */
  _authFirebase(firebaseToken) {
    debug('authFirebase');
    this.fbRef = new Firebase(this.fbUrl);
    return Promise.resolve(
      Firebase.auth().signInWithCustomToken(firebaseToken)
        .then((credential) => credential.user.getIdTokenResult()),
    ).then((result) => ({
      auth: {
        id: result.claims.user_id || result.claims.sub,
        username: result.claims.username,
      },
      // v2 reported seconds since epoch; getIdTokenResult gives a date string
      expires: Math.floor(new Date(result.expirationTime).getTime() / 1000),
    }));
  }

  _deauthFirebase() {
    debug('deauthFirebase');
    if (this.userId) {
      this.fbRef
        .child('users')
        .child(this.userId)
        .child('presence')
        .update({
          status: 'offline',
          ended: Firebase.ServerValue.TIMESTAMP,
        });
    }
    // v2's ref.unauth() became a sign-out on the auth instance
    return Firebase.auth().signOut();
  }

  _decodeFirebaseToken(token) {
    debug('_decodeFirebaseToken');
    this.userId = token.auth.id;
    this.username = token.auth.username;
    return this.expires = token.expires;
  }

  /*
    Show url for purchasing premium currency on external site
  */
  initPremiumPurchase() {
    return Promise.resolve('');
  }

  login(username, password, silent) {
    if (silent == null) { silent = false; }
    debug(`login: ${username}`);

    const body = {};
    body.password = password;
    body.username = username;

    return Promise.resolve(
      fetch(`${this.url}/session`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }),
    )
      .bind(this)
      .timeout(10000)
      .catch(this._networkError)
      .then((this._checkResponse))
      .then((res) => {
        this.analyticsData = res.analytics_data;
        this.token = res.token;
        // the API token authenticates US; firebase_token authenticates Firebase
        return this._authFirebase(res.firebase_token);
      })
      .then((res) => {
        debug(res);
        this.userId = res.auth.id;
        this.username = res.auth.username;
        this.expires = res.expires;

        const data = { token: this.token, userId: this.userId, analyticsData: this.analyticsData };
        if (!silent) {
          this.emit('login', data);
        }
        return data;
      });
  }

  logout() {
    debug('logout');

    // if @userId
    // @_deauthFirebase()

    if (this.token) {
      fetch(`${this.url}/session/logout`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
      }).catch(() => {});
    }

    this.fbRef = null;
    this.token = null;
    this.expires = null;
    this.userId = null;
    this.username = null;
    this.analyticsData = null;

    // clear storage
    return this.emit('logout');
  }

  register(opts) {
    debug(`register ${JSON.stringify(opts)}`);

    opts.is_desktop = window.isDesktop || false;

    return Promise.resolve(
      fetch(`${this.url}/session/register`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(opts),
      }),
    )
      .bind(this)
      .timeout(10000)
      .catch(this._networkError)
      .then((this._checkResponse))
      .then((data) => {
        debug(data);
        this.justRegistered = true;
        this.emit('registered');
        return { username: opts.username, password: opts.password };
      });
  }

  isUsernameAvailable(username) {
    return Promise.resolve(
      fetch(`${this.url}/session/username_available`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      }),
    )
      .then((res) => {
      // available
        if (res.ok) { return true; }
        // 401 result suggests username is bad or unavailable
        if (res.status === 401) { return false; }
        // all other results suggest server is unavailable or had an error
        // so assume username is valid and let the server handle it in the later registration request
        return true;
      }).catch((e) => {
        debug(`isUsernameAvailable ${e.message}`);
        return true;
      });
  }

  changeUsername(new_username) {
    return Promise.resolve(
      fetch(`${this.url}/session/change_username`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ new_username }),
      }),
    )
      .bind(this)
      .timeout(10000)
      .catch(this._networkError)
      .then(this._checkResponse);
  }

  changePassword(currentPassword, new_password) {
    return Promise.resolve(
      fetch(`${this.url}/session/change_password`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password,
        }),
      }),
    )
      .bind(this)
      .timeout(5000)
      .catch(this._networkError)
      .then(this._checkResponse);
  }

  changePortrait(portraitId) {
    if ((portraitId == null)) {
      return Promise.reject(new Error('Invalid portrait!'));
    }

    return Promise.resolve(
      fetch(`${this.url}/api/me/profile/portrait_id`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ portrait_id: portraitId }),
      }),
    )
      .bind(this)
      .timeout(5000)
      .catch(this._networkError)
      .then(this._checkResponse);
  }

  changeBattlemap(battlemapId) {
    return Promise.resolve(
      fetch(`${this.url}/api/me/profile/battle_map_id`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ battle_map_id: battlemapId }),
      }),
    )
      .bind(this)
      .timeout(5000)
      .catch(this._networkError)
      .then(this._checkResponse);
  }

  /*
   * Restore a stored session (plan 9.3).
   *
   * The order here is inverted from what it used to be. Under firebase 2.x the
   * stored API token was ALSO a valid Firebase credential, so this signed into
   * Firebase first and read the user id back out of the decoded token. Custom
   * tokens cannot be stored and replayed that way - they are short-lived (~1h)
   * and are exchanged for a session, so a token kept in local storage is
   * almost always expired by the time it is used.
   *
   * So we now validate with our own server FIRST, which both confirms the
   * stored token and hands back a freshly minted firebase_token, and only then
   * authenticate to Firebase with that.
   */
  isAuthenticated(token) {
    if ((token == null)) { return Promise.resolve(false); }

    this.token = token;
    return Promise.resolve(
      fetch(`${this.url}/session`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }),
    )
      .bind(this)
      .timeout(15000)
      .then((res) => {
        debug(`isAuthenticated:fetch ${res.ok}`);
        if (!res.ok) { return null; }
        // TODO: @marwan what is the proper way to prevent _checkResponse's errors from causing this to go to the try catch
        // I'm guessing you were trying to avoid that by only checking res.ok?
        return this._checkResponse(res);
      })
      .then((data) => {
        if (data === null) { return null; }
        this.analyticsData = data.analytics_data;
        // the server re-issues both on every session check
        if (data.token) { this.token = data.token; }
        return this._authFirebase(data.firebase_token).then((decoded) => {
          debug('isAuthenticated:authFirebase', decoded);
          this.userId = decoded.auth.id;
          this.username = decoded.auth.username;
          this.expires = decoded.expires;
          return data;
        });
      })
      .then((data) => {
        if (data === null) { return false; }

        this.emit('login', { token: this.token, userId: this.userId, analyticsData: this.analyticsData });
        return true;
      })
      .catch((e) => {
        debug(`isAuthenticated:failed ${e.message}`);
        return false;
      });
  }

  refreshToken(silent) {
    if (silent == null) { silent = false; }
    if ((this.token == null)) { return Promise.resolve(null); }
    return Promise.resolve(
      fetch(`${this.url}/session`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
      }),
    )
      .then((res) => {
        debug(`refreshToken:fetch ${res.ok}`);
        if (!res.ok) { return null; }
        return this._checkResponse(res);
      }).then((data) => {
        if (data === null) { return null; }
        // override existing token and analytics with new ones
        this.token = data.token;
        this.analyticsData = data.analytics_data;
        return this._authFirebase(this.token);
      })
      .then((decodedToken) => {
        this.userId = decodedToken.auth.id;
        this.username = decodedToken.auth.username;
        this.expires = decodedToken.expires;
        // emit login event with whatever data we currently have
        if (!silent) {
          this.emit('login', { token: this.token, analyticsData: this.analyticsData, userId: this.userId });
        }
        return true;
      })
      .catch((e) => {
        debug(`refreshToken:failed ${e.message}`);
        return null;
      });
  }

  // Returns whether this is the player's first session of the day based on their last session timestamp
  // Note: this can change during the session if a new day begins
  getIsFirstSessionOfDay() {
    // If no analytics data this is being called before auth, shouldn't happen but return false
    if ((this.analyticsData == null)) {
      return false;
    }

    // Having no last_session_at means this is their first session ever
    if ((this.analyticsData.last_session_at == null)) {
      return true;
    }

    const startOfTodayMoment = moment.utc().startOf('day');
    const lastSessionStartOfDayMoment = moment.utc(this.analyticsData.last_session_at).startOf('day');

    return lastSessionStartOfDayMoment.valueOf() < startOfTodayMoment.valueOf();
  }

  saveToStorage() {
    if (this.token) {
      return Storage.set('token', this.token);
    }
  }

  clearStorage() {
    return Storage.remove('token');
  }
}

module.exports = new Session();

module.exports.create = (options) => new Session(options);
