/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const SpellHealYourGeneral = require('./spellHealYourGeneral');

class SpellHealGeneralForEachFriendlyMinion extends SpellHealYourGeneral {
  declare healModifier: any;
  declare healAmountPerMinion: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    for (var unit of Array.from<any>(board.getUnits(true, false))) {
      if (((unit != null ? unit.getOwnerId() : undefined) === this.getOwnerId()) && !unit.getIsGeneral()) {
        this.healModifier += this.healAmountPerMinion;
      }
    }

    return super.onApplyEffectToBoardTile(board, x, y, sourceAction);
  }
}
SpellHealGeneralForEachFriendlyMinion.prototype.healModifier = 0;
SpellHealGeneralForEachFriendlyMinion.prototype.healAmountPerMinion = 0;

module.exports = SpellHealGeneralForEachFriendlyMinion;
