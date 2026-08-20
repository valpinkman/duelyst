/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Cards = require('app/sdk/cards/cardsLookupComplete');
const TeleportAction = require('app/sdk/actions/teleportAction');
const _ = require('underscore');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitMoveEnemyGeneralForward extends ModifierOpeningGambit {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitMoveEnemyGeneralForward';

  onOpeningGambit() {
    let movePosition;
    const enemyGeneral = this.getCard()
      .getGameSession()
      .getGeneralForPlayerId(
        this.getGameSession().getOpponentPlayerIdOfPlayerId(this.getCard().getOwnerId()),
      );
    const enemyPosition = enemyGeneral.getPosition();
    const board = this.getGameSession().getBoard();
    if (enemyGeneral.isOwnedByPlayer1()) {
      // if owned by player one, check the spot to the right of the general
      if (enemyPosition.x < 8) {
        movePosition = board.getUnitAtPosition({ x: enemyPosition.x + 1, y: enemyPosition.y });
        enemyPosition.x += 1;
      }
    }
    if (enemyGeneral.isOwnedByPlayer2()) {
      // if owned by player two, check the spot to the left of the general
      if (enemyPosition.x > 0) {
        movePosition = board.getUnitAtPosition({ x: enemyPosition.x - 1, y: enemyPosition.y });
        enemyPosition.x -= 1;
      }
    }

    if (movePosition == null) {
      // if there's no unit currently sitting in the position we want to move the general
      const teleAction = new TeleportAction(this.getGameSession());
      teleAction.setOwnerId(this.getOwnerId());
      teleAction.setSource(enemyGeneral);
      teleAction.setTargetPosition({ x: enemyPosition.x, y: enemyPosition.y });
      teleAction.setFXResource(_.union(teleAction.getFXResource(), this.getFXResource()));
      return this.getGameSession().executeAction(teleAction);
    }
  }
}
ModifierOpeningGambitMoveEnemyGeneralForward.prototype.type =
  'ModifierOpeningGambitMoveEnemyGeneralForward';
ModifierOpeningGambitMoveEnemyGeneralForward.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
];

module.exports = ModifierOpeningGambitMoveEnemyGeneralForward;
