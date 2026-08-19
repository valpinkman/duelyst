/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierMyOtherMinionsDamagedWatch = require('./modifierMyOtherMinionsDamagedWatch');
const ModifierGrow = require('./modifierGrow');

class ModifierMyOtherMinionsDamagedWatchDamagedMinionGrows extends ModifierMyOtherMinionsDamagedWatch {
  declare type: any;

  static type = 'ModifierMyOtherMinionsDamagedWatchDamagedMinionGrows';

  onDamageDealtToMinion(action) {
    const minion = action.getTarget();
    if ((minion != null) && minion.hasActiveModifierClass(ModifierGrow)) {
      return Array.from<any>(minion.getActiveModifiersByClass(ModifierGrow)).map((mod) =>
        mod.activateGrow());
    }
  }
}
ModifierMyOtherMinionsDamagedWatchDamagedMinionGrows.prototype.type = 'ModifierMyOtherMinionsDamagedWatchDamagedMinionGrows';
// activate each instance of Grow on the minion

module.exports = ModifierMyOtherMinionsDamagedWatchDamagedMinionGrows;
