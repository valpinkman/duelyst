/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const SpellFollowupKillTarget = require('./spellFollowupKillTarget');

class SpellFollowupKillTargetByAttack extends SpellFollowupKillTarget {
  declare maxAttack: any;

  _postFilterPlayPositions(validPositions) {
    validPositions = super._postFilterPlayPositions(validPositions);
    const finalPositions = [];
    const board = this.getGameSession().getBoard();
    for (var position of Array.from<any>(validPositions)) {
      if (__guard__(board.getUnitAtPosition(position), (x) => x.getATK()) <= this.maxAttack) {
        finalPositions.push(position);
      }
    }

    return finalPositions;
  }
}
SpellFollowupKillTargetByAttack.prototype.maxAttack = 0;

module.exports = SpellFollowupKillTargetByAttack;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
