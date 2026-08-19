/*
 * decaffeinate suggestions:
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const StopBufferingEventsAction = require('./stopBufferingEventsAction');

class EndFollowupAction extends StopBufferingEventsAction {
  static initClass() {
    this.type = 'EndFollowupAction';
  }

  constructor() {
    super(...arguments);
  }

  isRemovableDuringScrubbing() {
    return false;
  }
}
EndFollowupAction.initClass();

module.exports = EndFollowupAction;
