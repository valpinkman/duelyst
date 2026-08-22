/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('@duelyst/common/logger');
const PlayCardSilentlyAction = require('./playCardSilentlyAction');
const _ = require('underscore');

/*
  Play a card to board as a transform.
*/

class PlayCardAsTransformAction extends PlayCardSilentlyAction {
  static type = 'PlayCardAsTransformAction';

  constructor() {
    super(...arguments);
  }
}

module.exports = PlayCardAsTransformAction;
