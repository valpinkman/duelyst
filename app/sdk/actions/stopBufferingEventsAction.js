/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const Action = require('./action');

class StopBufferingEventsAction extends Action {
  static initClass() {
    this.type = 'StopBufferingEventsAction';
  }

  constructor() {
    super(...arguments);
  }

  isRemovableDuringScrubbing() {
    return false;
  }

  _execute() {
    super._execute();

    return this.getGameSession().p_stopBufferingEvents();
  }
}
StopBufferingEventsAction.initClass();

module.exports = StopBufferingEventsAction;
