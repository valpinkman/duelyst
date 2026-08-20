/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const ModifierEnemyGeneralAttackedWatch = require('./modifierEnemyGeneralAttackedWatch');

class ModifierEnemyGeneralAttackedWatchSummonBehindAndDrawCard extends ModifierEnemyGeneralAttackedWatch {
  declare type: any;

  static type = 'ModifierEnemyGeneralAttackedWatchSummonBehindAndDrawCard';

  onEnemyGeneralAttackedWatch(action) {
    const enemyGeneral = this.getGameSession().getGeneralForOpponentOfPlayerId(
      this.getCard().getOwnerId(),
    );
    const board = this.getGameSession().getBoard();

    let playerOffset = 0;
    if (this.getCard().isOwnedByPlayer1()) {
      playerOffset = 1;
    } else {
      playerOffset = -1;
    }
    const behindPosition = {
      x: enemyGeneral.getPosition().x + playerOffset,
      y: enemyGeneral.getPosition().y,
    };

    if (
      board.isOnBoard(behindPosition) &&
      !board.getObstructionAtPositionForEntity(behindPosition, this.getCard())
    ) {
      const playCardAction = new PlayCardSilentlyAction(
        this.getGameSession(),
        this.getCard().getOwnerId(),
        behindPosition.x,
        behindPosition.y,
        this.getCard().getIndex(),
      );
      this.getGameSession().executeAction(playCardAction);

      const deck = this.getGameSession().getPlayerById(this.getCard().getOwnerId()).getDeck();
      return this.getCard().getGameSession().executeAction(deck.actionDrawCard());
    }
  }
}
ModifierEnemyGeneralAttackedWatchSummonBehindAndDrawCard.prototype.type =
  'ModifierEnemyGeneralAttackedWatchSummonBehindAndDrawCard';

module.exports = ModifierEnemyGeneralAttackedWatchSummonBehindAndDrawCard;
