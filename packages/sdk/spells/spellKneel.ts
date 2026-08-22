/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('@duelyst/common/logger');
const Spell = require('./spell');
const CardType = require('@duelyst/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const TeleportAction = require('@duelyst/sdk/actions/teleportAction');
const CONFIG = require('@duelyst/common/config');
const _ = require('underscore');

class SpellKneel extends Spell {
  declare targetType: any;
  declare spellFilterType: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);
    const applyEffectPosition = { x, y };

    // Logger.module("SDK").debug "[G:#{@.getGameSession().gameId}]", "SpellKneel::onApplyEffectToBoardTile "
    const source = board.getCardAtPosition(applyEffectPosition, this.targetType);
    const teleAction = new TeleportAction(this.getGameSession());
    teleAction.setOwnerId(this.getOwnerId());
    teleAction.setSource(source);
    teleAction.setTargetPosition(this.getTeleportTargetPosition());
    teleAction.setFXResource(_.union(teleAction.getFXResource(), this.getFXResource()));
    return this.getGameSession().executeAction(teleAction);
  }

  getTeleportTargetPosition() {
    const targetGeneral = this.getGameSession().getGeneralForPlayerId(this.getOwnerId());
    if (targetGeneral != null) {
      // set x offset based on which direction the target General faces
      let offset;
      const targetGeneralPosition = targetGeneral.getPosition();
      if (targetGeneral.isOwnedByPlayer1()) {
        offset = 1;
      } else {
        offset = -1;
      }
      return { x: targetGeneralPosition.x + offset, y: targetGeneralPosition.y };
    }
  }

  _postFilterPlayPositions(validPositions) {
    // if there is a valid unit to teleport, and the position we want to teleport to is empty and on the board
    const board = this.getGameSession().getBoard();
    if (
      validPositions.length > 0 &&
      !board.getCardAtPosition(this.getTeleportTargetPosition(), this.targetType) &&
      board.isOnBoard(this.getTeleportTargetPosition())
    ) {
      // allow the spell to be cast
      return super._postFilterPlayPositions(validPositions);
    }
    return [];
  }
}
SpellKneel.prototype.targetType = CardType.Unit;
SpellKneel.prototype.spellFilterType = SpellFilterType.NeutralDirect;

module.exports = SpellKneel;
