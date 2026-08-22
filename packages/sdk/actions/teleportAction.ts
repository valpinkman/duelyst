/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('@duelyst/common/logger');
const Action = require('./action');
const CardType = require('@duelyst/sdk/cards/cardType');

class TeleportAction extends Action {
  declare fxResource: any;

  static type = 'TeleportAction';

  constructor() {
    super(...arguments);
  }

  /*
   * Returns whether this was a valid teleport, i.e. whether source and target positions are different.
   * NOTE: in some teleport action subclasses, this may only return reliable values after execution!
   * @returns {Boolean}
   */
  getIsValidTeleport() {
    const targetPosition = this.getTargetPosition();
    if (targetPosition != null) {
      const sourcePosition = this.getSourcePosition();
      if (
        sourcePosition == null ||
        sourcePosition.x !== targetPosition.x ||
        sourcePosition.y !== targetPosition.y
      ) {
        return true;
      }
    }
    return false;
  }

  _execute() {
    super._execute();

    const unit = this.getSource();
    const board = this.getGameSession().getBoard();
    const targetPosition = this.getTargetPosition();

    // at execution time, make sure the target position is unoccupied and on the board
    if (
      unit != null &&
      unit.getIsActive() &&
      targetPosition != null &&
      !board.getObstructionAtPositionForEntity(targetPosition, unit) &&
      board.isOnBoard(targetPosition)
    ) {
      // Logger.module("SDK").debug "[G:#{@.getGameSession().gameId}]", "TeleportAction::execute - moving unit #{JSON.stringify(unit?.getLogName())} to #{targetPosition.x}, #{targetPosition.y}"
      return unit.setPosition(targetPosition);
    }
    // teleport aborted at execution time
    return this.setTargetPosition(this.getSourcePosition());
  }
}
TeleportAction.prototype.fxResource = ['FX.Actions.Teleport'];

module.exports = TeleportAction;
