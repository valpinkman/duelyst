/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Spell = require('./spell');
const CardType = require('app/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');

/*
  Abstract class that should be the super class for ANY spell that applies entities to the board.
*/
class SpellApplyEntityToBoard extends Spell {
  declare sourceType: any;
  declare targetType: any;
  declare spellFilterType: any;
  declare filterPlayPositionsForEntity: any;

  getEntityToSpawn() {
    // override in subclasses and provide entity that will be applied to board
    return null;
  }

  _postFilterPlayPositions(validPositions) {
    if (this.filterPlayPositionsForEntity) {
      const entity = this.getEntityToSpawn();
      if (entity != null) {
        const filteredPositions = [];
        for (var position of Array.from<any>(validPositions)) {
          if (
            !this.getGameSession().getBoard().getObstructionAtPositionForEntity(position, entity)
          ) {
            filteredPositions.push(position);
          }
        }
        return filteredPositions;
      }
      return super._postFilterPlayPositions(validPositions);
    }
    return super._postFilterPlayPositions(validPositions);
  }
}
SpellApplyEntityToBoard.prototype.sourceType = CardType.Entity;
SpellApplyEntityToBoard.prototype.targetType = CardType.Entity;
SpellApplyEntityToBoard.prototype.spellFilterType = SpellFilterType.None;
SpellApplyEntityToBoard.prototype.filterPlayPositionsForEntity = true;

module.exports = SpellApplyEntityToBoard;
