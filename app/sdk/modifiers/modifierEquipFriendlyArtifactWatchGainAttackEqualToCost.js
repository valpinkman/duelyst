/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierEquipFriendlyArtifactWatch = require('./modifierEquipFriendlyArtifactWatch');
const Modifier = require('./modifier');

class ModifierEquipFriendlyArtifactWatchGainAttackEqualToCost extends ModifierEquipFriendlyArtifactWatch {
  static type = 'ModifierEquipFriendlyArtifactWatchGainAttackEqualToCost';

  static createContextObject(buffName, options) {
    const contextObject = super.createContextObject(options);
    contextObject.buffName = buffName;
    return contextObject;
  }

  onEquipFriendlyArtifactWatch(action, artifact) {
    if (artifact != null) {
      const manaCost = artifact.getManaCost();
      if ((manaCost != null) && (manaCost > 0)) {
        const attackModifier = Modifier.createContextObjectWithAttributeBuffs(manaCost, 0);
        attackModifier.appliedName = this.buffName;
        return this.getCard().getGameSession().applyModifierContextObject(attackModifier, this.getCard());
      }
    }
  }
}
ModifierEquipFriendlyArtifactWatchGainAttackEqualToCost.prototype.type = 'ModifierEquipFriendlyArtifactWatchGainAttackEqualToCost';
ModifierEquipFriendlyArtifactWatchGainAttackEqualToCost.prototype.fxResource = ['FX.Modifiers.ModifierGenericBuff'];
ModifierEquipFriendlyArtifactWatchGainAttackEqualToCost.prototype.buffName = null;

module.exports = ModifierEquipFriendlyArtifactWatchGainAttackEqualToCost;
