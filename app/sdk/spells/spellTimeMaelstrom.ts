/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const SpellRefreshExhaustion = require('./spellRefreshExhaustion');
const SpellFilterType = require('./spellFilterType');

class SpellTimeMaelstrom extends SpellRefreshExhaustion {
  declare spellFilterType: any;
  declare canTargetGeneral: any;

  _postFilterApplyPositions(validPositions) {
    const ownGeneral = this.getGameSession().getGeneralForPlayerId(this.getOwnerId());
    const finalPositions = [];
    for (var position of Array.from<any>(validPositions)) {
      if (this.getGameSession().getBoard().getCardAtPosition(position) === ownGeneral) {
        finalPositions.push(position);
      }
    }
    return finalPositions;
  }
}
SpellTimeMaelstrom.prototype.spellFilterType = SpellFilterType.AllyIndirect;
SpellTimeMaelstrom.prototype.canTargetGeneral = true;

module.exports = SpellTimeMaelstrom;
