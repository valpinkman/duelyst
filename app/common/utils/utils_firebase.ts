const { Base64 } = require('js-base64');

/*
 * firebase 2.x exposed a ref's own key as `ref.name()` and its parent as
 * `ref.parent()`. From v3 onwards both are plain properties (`ref.key`,
 * `ref.parent`), and `parent` is null at the root rather than a ref.
 */
exports.pathName = function (ref) {
  const p = ref.parent && ref.parent.key;
  return (p ? `${p}/` : '') + ref.key;
};

exports.getNumChildren = function (ref, callback) {
  ref.once('value', (snapshot) => {
    callback(snapshot.numChildren());
  }, callback);
};
