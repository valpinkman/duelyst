/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Modifier = require('app/sdk/modifiers/modifier');
const ModifierBuilding = require('./modifierBuilding');

class ModifierBuildingSlowEnemies extends ModifierBuilding {
  static type = 'ModifierBuildingSlowEnemies';

  onActivate() {
    super.onActivate();
    const speedBuffContextObject = Modifier.createContextObjectOnBoard();
    speedBuffContextObject.attributeBuffs = { speed: 1 };
    speedBuffContextObject.attributeBuffsAbsolute = ['speed'];
    speedBuffContextObject.attributeBuffsFixed = ['speed'];
    speedBuffContextObject.appliedName = this.speedChangeAppliedName;
    speedBuffContextObject.appliedDescription = this.speedChangeAppliedDescription;
    const auraContextObject = Modifier.createContextObjectWithOnBoardAuraForAllEnemies([speedBuffContextObject]);
    auraContextObject.auraIncludeGeneral = true;
    auraContextObject.appliedName = this.auraAppliedName;
    auraContextObject.appliedDescription = this.auraAppliedDescription;
    auraContextObject.isRemovable = false;
    return this.getGameSession().applyModifierContextObject(auraContextObject, this.getCard(), this);
  }
}
ModifierBuildingSlowEnemies.prototype.type = 'ModifierBuildingSlowEnemies';
ModifierBuildingSlowEnemies.prototype.auraAppliedName = null;
ModifierBuildingSlowEnemies.prototype.auraAppliedDescription = null;
ModifierBuildingSlowEnemies.prototype.speedChangeAppliedName = null;
ModifierBuildingSlowEnemies.prototype.speedChangeAppliedDescription = null;

module.exports = ModifierBuildingSlowEnemies;
