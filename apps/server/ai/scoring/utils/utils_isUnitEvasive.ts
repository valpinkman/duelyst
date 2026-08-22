const BOUNTY = require('apps/server/ai/scoring/bounty');
const ModifierRanged = require('@duelyst/sdk/modifiers/modifierRanged');
const ModifierBlastAttack = require('@duelyst/sdk/modifiers/modifierBlastAttack');
const ModifierEphemeral = require('@duelyst/sdk/modifiers/modifierEphemeral');
const ModifierForcefieldAbsorb = require('@duelyst/sdk/modifiers/modifierForcefieldAbsorb');
const isUnitBuffer = require('apps/server/ai/scoring/utils/utils_isUnitBuffer');

/**
 * Returns whether a unit is evasive.
 * @param {Unit} unit
 * @returns {Boolean}
 */
const isUnitEvasive = function (unit) {
  return (
    (unit.hasModifierClass(ModifierRanged) ||
      unit.hasModifierClass(ModifierBlastAttack) ||
      // Look into improving isUnitBuffer function.
      (isUnitBuffer(unit) &&
        unit.getHP() < BOUNTY.BUFFER_HP_EVASIVE_THRESHOLD &&
        !unit.hasModifierClass(ModifierForcefieldAbsorb)) ||
      (unit.getIsGeneral() && unit.getHP() < BOUNTY.GENERAL_HP_EVASIVE_THRESHOLD)) &&
    !unit.hasModifierClass(ModifierEphemeral)
  );
};

module.exports = isUnitEvasive;
