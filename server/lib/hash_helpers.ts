/*
 * A small helper module for hash generation and compares
 * Uses node's util.promisify on the bcrypt module
 * Methods are both node style callback and promise compatible
 * @module hash_helpers
 */

const { promisify } = require('util');
const bcrypt = require('bcrypt');
const PromiseUtils = require('../../app/common/utils/utils_promise');

/* Promise-compatible wrappers around bcrypt's callback API. */
const genSaltAsync = promisify(bcrypt.genSalt);
const hashAsync = promisify(bcrypt.hash);
const compareAsync = promisify(bcrypt.compare);

/**
 * Generate a salt and hash using bcrypt when provided with a password
 * The dual then/callback signature makes this usable either way
 * @public
 * @param  {String}  password        A password to hash
 * @param  {Function}  [callback]        Optional callback(err,hash)
 * @return  {Promise}              Promise returning hash
 */
module.exports.generateHash = (password, callback) => genSaltAsync(10).then((salt) => PromiseUtils.nodeify(hashAsync(password, salt), callback));

/**
 * Compare a password against a bcrypt hash
 * The dual then/callback signature makes this usable either way
 * @public
 * @param  {String}  password        Password
 * @param  {String}  hash          Hash to compare to
 * @param  {Function}  [callback]        Optional callback(err,match)
 * @return  {Promise}              Promise returning true/false
 */
module.exports.comparePassword = (password, hash, callback) => PromiseUtils.nodeify(compareAsync(password, hash), callback);
