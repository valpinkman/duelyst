/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Action = require('./action');
const CardType = require('@duelyst/sdk/cards/cardType');

class RemoveAction extends Action {
  static type = 'RemoveAction';

  constructor() {
    super(...arguments);
  }

  _execute() {
    super._execute();

    const target = this.getTarget();
    const targetPosition = this.getTargetPosition();

    return this.getGameSession().removeCardFromBoard(
      target,
      targetPosition.x,
      targetPosition.y,
      this,
    );
  }
}

module.exports = RemoveAction;
