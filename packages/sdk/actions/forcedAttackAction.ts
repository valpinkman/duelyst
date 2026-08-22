/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const AttackAction = require('./attackAction');

class ForcedAttackAction extends AttackAction {
  static type = 'ForcedAttackAction';

  constructor(gameSession) {
    super(gameSession);
  }
}

module.exports = ForcedAttackAction;
