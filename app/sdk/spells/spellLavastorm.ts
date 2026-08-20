/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const CONFIG = require('app/common/config');
const SpellKillTarget = require('./spellKillTarget');
const SpellFilterType = require('./spellFilterType');

class SpellLavastorm extends SpellKillTarget {
  declare spellFilterType: any;

  static minAttackValue = 0;

  _findApplyEffectPositions(position, sourceAction) {
    const potentialApplyEffectPositions = super._findApplyEffectPositions(position, sourceAction);
    const applyEffectPositions = [];
    const board = this.getGameSession().getBoard();

    // apply to each unit with < minAttackValue attack
    for (position of Array.from<any>(potentialApplyEffectPositions)) {
      var unit = board.getUnitAtPosition(position);
      if (
        (unit != null ? unit.getATK() : undefined) < this.minAttackValue &&
        !unit.getIsGeneral()
      ) {
        applyEffectPositions.push(position);
      }
    }

    return applyEffectPositions;
  }
}
SpellLavastorm.prototype.spellFilterType = SpellFilterType.NeutralIndirect;

module.exports = SpellLavastorm;
