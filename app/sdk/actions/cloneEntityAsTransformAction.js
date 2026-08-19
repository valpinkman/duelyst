/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const UtilsJavascript = require('app/common/utils/utils_javascript');
const CloneEntityAction = require('./cloneEntityAction');
const CardType = require('app/sdk/cards/cardType');
const _ = require('underscore');

/*
Clone an entity on the board silently as a transform.
*/

class CloneEntityAsTransformAction extends CloneEntityAction {
  static type = 'CloneEntityAsTransformAction';

  constructor() {
    super(...arguments);
  }
}

module.exports = CloneEntityAsTransformAction;
