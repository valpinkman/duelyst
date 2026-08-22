/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const Action = require('./action');
const CardType = require('@duelyst/sdk/cards/cardType');

class SwapUnitsAction extends Action {
  declare fxResource: any;

  static type = 'SwapUnitsAction';

  constructor() {
    super(...arguments);
  }

  _execute() {
    super._execute();

    if (this.getSource() != null && this.getTarget() != null) {
      // normally we'll swap these units based on where they were when the action was created
      // but if either unit wasn't yet on the board at action creation, re-evaluate
      // their positions at action execution
      const board = this.getGameSession().getBoard();

      if (
        !board.isOnBoard(this.getTargetPosition()) ||
        !board.isOnBoard(this.getSourcePosition())
      ) {
        this.setTargetPosition(this.getTarget().getPosition());
        this.setSourcePosition(this.getSource().getPosition());
      }

      if (board.isOnBoard(this.getTargetPosition()) && board.isOnBoard(this.getSourcePosition())) {
        this.getSource().setPosition(this.getTargetPosition());
        return this.getTarget().setPosition(this.getSourcePosition());
      }
    }
  }
}
SwapUnitsAction.prototype.fxResource = ['FX.Actions.Teleport'];

module.exports = SwapUnitsAction;
