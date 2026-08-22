/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Modifier = require('@duelyst/sdk/modifiers/modifier');
const SpellKillTarget = require('./spellKillTarget');
const _ = require('underscore');

class SpellSkyBurial extends SpellKillTarget {
  _postFilterPlayPositions(validPositions) {
    const filteredPositions = [];

    if (validPositions.length > 0) {
      // spell only applies to units not nearby a general
      const board = this.getGameSession().getBoard();
      const general1 = this.getGameSession().getGeneralForPlayer1();
      const general2 = this.getGameSession().getGeneralForPlayer2();
      const unitsAroundGenerals = _.uniq(
        _.union(
          board.getEntitiesAroundEntity(general1, this.targetType, 1),
          board.getEntitiesAroundEntity(general2, this.targetType, 1),
        ),
      );

      for (var position of Array.from<any>(validPositions)) {
        var validPosition = true;
        for (var unit of Array.from<any>(unitsAroundGenerals)) {
          if (unit.position.x === position.x && unit.position.y === position.y) {
            validPosition = false;
            break;
          }
        }

        if (validPosition) {
          filteredPositions.push(position);
        }
      }
    }

    return filteredPositions;
  }
}

module.exports = SpellSkyBurial;
