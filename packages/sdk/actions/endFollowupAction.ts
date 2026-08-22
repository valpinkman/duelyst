/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('@duelyst/common/logger');
const StopBufferingEventsAction = require('./stopBufferingEventsAction');

class EndFollowupAction extends StopBufferingEventsAction {
  static type = 'EndFollowupAction';

  constructor() {
    super(...arguments);
  }

  isRemovableDuringScrubbing() {
    return false;
  }
}

module.exports = EndFollowupAction;
