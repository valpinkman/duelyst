/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const generatePushId = require('@duelyst/common/generate_push_id');
const Errors = require('./custom_errors');
const Logger = require('@duelyst/common/logger');

/**
 * Requests a 'once' query on a firebase location.
 * @public
 * @static
 * @param  {Firebase}  ref      Reference to firebase location on which to execute query
 * @param  {String}  eventName  One of the following strings: "value", "child_added", "child_changed", "child_removed", or "child_moved."
 * @return  {Promise}        Promise that will resolve with the Firebase snapshot, or reject with an error if the query fails.
 */
module.exports.once = (ref, eventName) =>
  new Promise(function (resolve, reject) {
    const onLoaded = (snapshot) => resolve(snapshot);
    const onError = (err) => reject(err);
    return ref.once(eventName, onLoaded, onError);
  });

/**
 * Sets data to a firebase location.
 * @public
 * @static
 * @param  {Firebase}  ref      Reference to firebase location on which to run operation
 * @param  {Object}  value    The data to write to this location.
 * @return  {Promise}        Promise that will resolve with the value written, or reject with an error if the operation fails.
 */
module.exports.set = (ref, value) =>
  // console.log("FIREBASE::set",ref.toString())

  new Promise((resolve, reject) =>
    ref.set(value, function (err) {
      if (err) {
        return reject(new Error('Firebase.set error ' + err.message));
      } else {
        return resolve(value);
      }
    }),
  );

/**
 * Sets data to a firebase location with a priority for ordering.
 * @public
 * @static
 * @param  {Firebase}        ref      Reference to firebase location on which to run operation
 * @param  {Object}        value    The data to write to this location.
 * @param  {String or Number}    priority  The priority (order index) for this location.
 * @return  {Promise}              Promise that will resolve with the value written, or reject with an error if the operation fails.
 */
module.exports.setWithPriority = (ref, value, priority) =>
  // console.log("FIREBASE::setWithPriority",ref.toString())

  new Promise((resolve, reject) =>
    ref.setWithPriority(value, priority, function (err) {
      if (err) {
        return reject(new Error('Firebase.setWithPriority error ' + err.message));
      } else {
        return resolve(value);
      }
    }),
  );

/**
 * Update data on a firebase location without touching other data at the same location
 * @public
 * @static
 * @param  {Firebase}        ref      Reference to firebase location on which to run operation
 * @param  {Object}        value    The key/value map of data to write to this location.
 * @return  {Promise}              Promise that will resolve with the value written, or reject with an error if the operation fails.
 */
module.exports.update = (ref, value) =>
  // console.log("FIREBASE::update",ref.toString())

  new Promise((resolve, reject) =>
    ref.update(value, function (err) {
      if (err) {
        return reject(new Error('Firebase.update error ' + err.message));
      } else {
        return resolve(value);
      }
    }),
  );

/**
 * Push data on to a firebase location without touching other data at the same location
 * @public
 * @static
 * @param  {Firebase}        ref      Reference to firebase location on which to run operation
 * @param  {Object}        value    The data to push to this location.
 * @return  {Promise}              Promise that will resolve with a firebase reference to the location of the push, or reject with an error if the operation fails.
 */
module.exports.push = (ref, value) =>
  new Promise(function (resolve, reject) {
    let pushedRef;
    return (pushedRef = ref.push(value, function (err) {
      if (err) {
        return reject(new Error('Firebase.push error ' + err.message));
      } else {
        return resolve(pushedRef);
      }
    }));
  });

/**
 * Delete data on a firebase location.
 * @public
 * @static
 * @param  {Firebase}        ref      Reference to firebase location on which to run operation
 * @return  {Promise}              Promise that will resolve if operation succeeds, or reject with an error if the operation fails.
 */
module.exports.remove = (ref, value) =>
  // console.log("FIREBASE::remove",ref.toString())

  new Promise((resolve, reject) =>
    ref.remove(function (err) {
      if (err) {
        return reject(new Error('Firebase.remove error ' + err.message));
      } else {
        return resolve(value);
      }
    }),
  );

/**
 * Execute a custom reliable transaction on a firebase location to update data.
 * @public
 * @static
 * @param  {Firebase}  ref      Reference to firebase location on which to execute transaction
 * @param  {Function}  updateFn  Function that transforms the data, returns undefined to
 * @return  {Promise}        Promise that will resolve with the Firebase snapshot, or reject with an error if the transaction fails.
 */
module.exports.safeTransaction = function (ref, updateFn) {
  // console.log("FIREBASE::safeTransaction",ref.toString())

  if (ref == null) {
    return Promise.reject(new Error('firebase ref is null or not defined'));
  }

  if (updateFn == null) {
    return Promise.reject(new Error('transaction updateFn is null or not defined'));
  }

  return new Promise(function (resolve, reject) {
    // generate a lexically increasing transaction id
    const tx_id = generatePushId();
    let innerError = null;
    Logger.module('FB').time(`Firebase transaction for /${ref} (${tx_id})`);

    const txUpdateData = function (data) {
      let updatedData;
      innerError = null;
      // clone the data so if the update function modifies it it before failing it doesn't write half modified data back
      const dataIn = JSON.parse(JSON.stringify(data));
      // update data
      try {
        updatedData = updateFn(dataIn);
        if (updatedData instanceof Error) {
          innerError = updatedData;
        }
      } catch (err) {
        innerError = err;
      }

      // if transaction does not return undefined
      if (!innerError && typeof updatedData !== 'undefined') {
        // replace data var
        data = updatedData;
        // mark with transaction id
        if (data != null) {
          data.tx_id = tx_id;
        }
      }

      return data;
    };

    const onTxUpdateComplete = function (error, committed, snapshot) {
      Logger.module('FB').timeEnd(`Firebase transaction for /${ref} (${tx_id})`);
      if (error) {
        return reject(error);
      } else if (committed && __guard__(snapshot.val(), (x) => x.tx_id) === tx_id) {
        return resolve(snapshot);
      } else if (committed) {
        return reject(
          innerError ||
            new Errors.FirebaseTransactionDidNotCommitError(
              'transaction ID indicates a failed update',
            ),
        );
      } else {
        return reject(new Errors.FirebaseTransactionDidNotCommitError());
      }
    };

    return ref.transaction(txUpdateData, onTxUpdateComplete);
  });
};

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
