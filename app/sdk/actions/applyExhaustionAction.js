/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Action = require('./action');
const CardType = require('app/sdk/cards/cardType');

class ApplyExhaustionAction extends Action {
  static type = 'ApplyExhaustionAction';

  constructor(gameSession) {
    super(...arguments);
  }

  _execute() {
    super._execute();
    const target = this.getTarget();
    if (target != null) {
      return target.applyExhaustion();
    }
  }
}

module.exports = ApplyExhaustionAction;
