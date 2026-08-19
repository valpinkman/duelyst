/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const DrawCardAction = require('app/sdk/actions/drawCardAction');
const ModifierMyGeneralDamagedWatch = require('./modifierMyGeneralDamagedWatch');

class ModifierMyGeneralDamagedWatchMiniMinion extends ModifierMyGeneralDamagedWatch {
  declare type: any;
  declare fxResource: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;

  static type = 'ModifierMyGeneralDamagedWatchMiniMinion';

  onDamageDealtToGeneral(action) {
    const enemyGeneral = this.getCard().getGameSession().getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId());
    const board = this.getGameSession().getBoard();

    let playerOffset = 0;
    if (this.getCard().isOwnedByPlayer1()) { playerOffset = 1; } else { playerOffset = -1; }
    const behindPosition = { x: enemyGeneral.getPosition().x + playerOffset, y: enemyGeneral.getPosition().y };

    if (board.isOnBoard(behindPosition) && !board.getObstructionAtPositionForEntity(behindPosition, this.getCard())) {
      const playCardAction = new PlayCardSilentlyAction(this.getGameSession(), this.getCard().getOwnerId(), behindPosition.x, behindPosition.y, this.getCard().getIndex());
      this.getGameSession().executeAction(playCardAction);
      return this.getGameSession().executeAction(new DrawCardAction(this.getGameSession(), this.getCard().getOwnerId()));
    }
  }
}
ModifierMyGeneralDamagedWatchMiniMinion.prototype.type = 'ModifierMyGeneralDamagedWatchMiniMinion';
ModifierMyGeneralDamagedWatchMiniMinion.prototype.fxResource = ['FX.Modifiers.ModifierMyGeneralDamagedWatch'];
ModifierMyGeneralDamagedWatchMiniMinion.prototype.activeInHand = true;
ModifierMyGeneralDamagedWatchMiniMinion.prototype.activeInDeck = false;
ModifierMyGeneralDamagedWatchMiniMinion.prototype.activeInSignatureCards = false;
ModifierMyGeneralDamagedWatchMiniMinion.prototype.activeOnBoard = false;

module.exports = ModifierMyGeneralDamagedWatchMiniMinion;
