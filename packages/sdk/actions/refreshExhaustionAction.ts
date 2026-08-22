/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Action = require('./action');
const CardType = require('@duelyst/sdk/cards/cardType');

class RefreshExhaustionAction extends Action {
  static type = 'RefreshExhaustionAction';

  constructor() {
    super(...arguments);
  }

  _execute() {
    super._execute();
    const target = this.getTarget();
    if (target != null) {
      return target.refreshExhaustion();
    }
  }
}

module.exports = RefreshExhaustionAction;
