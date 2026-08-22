/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const Action = require('./action');

class StopBufferingEventsAction extends Action {
  static type = 'StopBufferingEventsAction';

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

module.exports = StopBufferingEventsAction;
