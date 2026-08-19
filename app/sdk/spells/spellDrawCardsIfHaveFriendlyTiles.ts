/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Spell = require('./spell');

class SpellDrawCardsIfHaveFriendlyTiles extends Spell {
  declare numCardsToDraw: any;
  declare numTilesRequired: any;
  declare tileId: any;

  onApplyOneEffectToBoard(board, x, y, sourceAction) {
    super.onApplyOneEffectToBoard(board, x, y, sourceAction);

    let numTiles = 0;
    return (() => {
      const result = [];
      for (var tile of Array.from<any>(board.getTiles(true, false))) {
        if ((tile.getOwnerId() === this.getOwnerId()) && (tile.getBaseCardId() === this.tileId)) {
          numTiles++;
          if (numTiles >= this.numTilesRequired) {
            var player = this.getGameSession().getPlayerById(this.getOwnerId());
            for (var i = 0, end = this.numCardsToDraw, asc = end >= 0; asc ? i < end : i > end; asc ? i++ : i--) {
              var drawAction = player.getDeck().actionDrawCard();
              this.getGameSession().executeAction(drawAction);
            }
            break;
          } else {
            result.push(undefined);
          }
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
}
SpellDrawCardsIfHaveFriendlyTiles.prototype.numCardsToDraw = 0;
SpellDrawCardsIfHaveFriendlyTiles.prototype.numTilesRequired = 0;
SpellDrawCardsIfHaveFriendlyTiles.prototype.tileId = null;

module.exports = SpellDrawCardsIfHaveFriendlyTiles;
