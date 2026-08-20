/*
 * A small helper module for hash generation and compares
 * Uses Bluebird to promisify the bcrypt modules
 * Methods are both node style callback and promise compatible
 * @module hash_helpers
 */

const Promise = require('bluebird');
const bcrypt = require('bcrypt');
const PromiseUtils = require('../../app/common/utils/utils_promise');

/* This call wraps the bcrypt module in a Promise compatible interface */
Promise.promisifyAll(bcrypt);

/**
 * Generate a salt and hash using bcrypt when provided with a password
 * The dual then/callback signature makes this usable either way
 * @public
 * @param  {String}  password        A password to hash
 * @param  {Function}  [callback]        Optional callback(err,hash)
 * @return  {Promise}              Promise returning hash
 */
module.exports.generateHash = (password, callback) => bcrypt.genSaltAsync(10).then((salt) => PromiseUtils.nodeify(bcrypt.hashAsync(password, salt), callback));

/**
 * Compare a password against a bcrypt hash
 * The dual then/callback signature makes this usable either way
 * @public
 * @param  {String}  password        Password
 * @param  {String}  hash          Hash to compare to
 * @param  {Function}  [callback]        Optional callback(err,match)
 * @return  {Promise}              Promise returning true/false
 */
module.exports.comparePassword = (password, hash, callback) => PromiseUtils.nodeify(bcrypt.compareAsync(password, hash), callback);
