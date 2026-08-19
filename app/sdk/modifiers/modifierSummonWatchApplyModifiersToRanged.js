/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Modifier = require('./modifier');
const ModifierSummonWatchApplyModifiers = require('./modifierSummonWatchApplyModifiers');
const ModifierRanged = require('./modifierRanged');

class ModifierSummonWatchApplyModifiersToRanged extends ModifierSummonWatchApplyModifiers {
  static type = 'ModifierSummonWatchApplyModifiersToRanged';

  getIsCardRelevantToWatcher(card) {
    return card.hasActiveModifierClass(ModifierRanged);
  }
}
ModifierSummonWatchApplyModifiersToRanged.prototype.type = 'ModifierSummonWatchApplyModifiersToRanged';
ModifierSummonWatchApplyModifiersToRanged.prototype.fxResource = ['FX.Modifiers.ModifierSummonWatch', 'FX.Modifiers.ModifierGenericBuff'];

module.exports = ModifierSummonWatchApplyModifiersToRanged;
