/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierOpeningGambit = require('app/sdk/modifiers/modifierOpeningGambit');
const ModifierBuilding = require('app/sdk/modifiers/modifierBuilding');

class ModifierOpeningGambitProgressBuild extends ModifierOpeningGambit {
  static type = 'ModifierOpeningGambitProgressBuild';
  static modifierName = 'Opening Gambit';
  static description = 'Progress your buildings by 1';

  onOpeningGambit() {
    return Array.from(this.getGameSession().getBoard().getFriendlyEntitiesForEntity(this.getCard())).map((unit) =>
      Array.from(unit.getActiveModifiersByClass(ModifierBuilding)).map((buildModifier) =>
        buildModifier.progressBuild()));
  }
}
ModifierOpeningGambitProgressBuild.prototype.type = 'ModifierOpeningGambitProgressBuild';
ModifierOpeningGambitProgressBuild.prototype.fxResource = ['FX.Modifiers.ModifierOpeningGambit'];

module.exports = ModifierOpeningGambitProgressBuild;
