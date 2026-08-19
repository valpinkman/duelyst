/*
 * decaffeinate suggestions:
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const PlayCardSilentlyAction = require('./playCardSilentlyAction');
const _ = require('underscore');

/*
  Play a card to board as a transform.
*/

class PlayCardAsTransformAction extends PlayCardSilentlyAction {
  static initClass() {
    this.type = 'PlayCardAsTransformAction';
  }

  constructor() {
    super(...arguments);
  }
}
PlayCardAsTransformAction.initClass();

module.exports = PlayCardAsTransformAction;
