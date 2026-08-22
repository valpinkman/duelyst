/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Spell = require('./spell');
const CardType = require('@duelyst/sdk/cards/cardType');
const ModifierBackstab = require('@duelyst/sdk/modifiers/modifierBackstab');
const ModifierBlastAttack = require('@duelyst/sdk/modifiers/modifierBlastAttack');
const ModifierTranscendance = require('@duelyst/sdk/modifiers/modifierTranscendance');
const ModifierFlying = require('@duelyst/sdk/modifiers/modifierFlying');
const ModifierForcefield = require('@duelyst/sdk/modifiers/modifierForcefield');
const ModifierFrenzy = require('@duelyst/sdk/modifiers/modifierFrenzy');
const ModifierGrow = require('@duelyst/sdk/modifiers/modifierGrow');
const ModifierProvoke = require('@duelyst/sdk/modifiers/modifierProvoke');
const ModifierRanged = require('@duelyst/sdk/modifiers/modifierRanged');
const ModifierRebirth = require('@duelyst/sdk/modifiers/modifierRebirth');
const ModifierFirstBlood = require('@duelyst/sdk/modifiers/modifierFirstBlood');
// ModifierInvulnerable = require '@duelyst/sdk/modifiers/modifierInvulnerable'

class SpellNeurolink extends Spell {
  onApplyOneEffectToBoard(board, x, y, sourceAction) {
    let modifier;
    super.onApplyOneEffectToBoard(board, x, y, sourceAction);

    const general = this.getGameSession().getGeneralForPlayerId(this.getOwnerId());
    const friendlyMinions = board.getFriendlyEntitiesForEntity(general, CardType.Unit, true, false);
    let hasBackstab = false;
    let hasBlast = false;
    let hasCelerity = false;
    let hasFlying = false;
    let hasForcefield = false;
    let hasFrenzy = false;
    let hasGrow = false;
    let hasProvoke = false;
    let hasRanged = false;
    let hasRebirth = false;
    let hasRush = false;
    // hasInvulnerable = false
    let growAmount = 0;
    let backstabAmount = 0;
    const modifierContextObjects = [];
    if (friendlyMinions != null) {
      for (var minion of Array.from<any>(friendlyMinions)) {
        if (minion != null) {
          if (minion.hasActiveModifierClass(ModifierBackstab)) {
            hasBackstab = true;
            for (modifier of Array.from<any>(minion.getModifiers())) {
              if (modifier instanceof ModifierBackstab && modifier.getIsActive()) {
                backstabAmount += modifier.getBackstabBonus();
              }
            }
          }
          if (!hasBlast && minion.hasActiveModifierClass(ModifierBlastAttack)) {
            hasBlast = true;
            modifierContextObjects.push(ModifierBlastAttack.createContextObject());
          }
          if (!hasCelerity && minion.hasActiveModifierClass(ModifierTranscendance)) {
            hasCelerity = true;
            modifierContextObjects.push(ModifierTranscendance.createContextObject());
          }
          if (!hasFlying && minion.hasActiveModifierClass(ModifierFlying)) {
            hasFlying = true;
            modifierContextObjects.push(ModifierFlying.createContextObject());
          }
          if (!hasForcefield && minion.hasActiveModifierClass(ModifierForcefield)) {
            hasForcefield = true;
            modifierContextObjects.push(ModifierForcefield.createContextObject());
          }
          if (!hasFrenzy && minion.hasActiveModifierClass(ModifierFrenzy)) {
            hasFrenzy = true;
            modifierContextObjects.push(ModifierFrenzy.createContextObject());
          }
          if (minion.hasActiveModifierClass(ModifierGrow)) {
            hasGrow = true;
            for (modifier of Array.from<any>(minion.getModifiers())) {
              if (modifier instanceof ModifierGrow && modifier.getIsActive()) {
                growAmount += modifier.getGrowBonus();
              }
            }
          }
          if (!hasProvoke && minion.hasActiveModifierClass(ModifierProvoke)) {
            hasProvoke = true;
            modifierContextObjects.push(ModifierProvoke.createContextObject());
          }
          if (!hasRanged && minion.hasActiveModifierClass(ModifierRanged)) {
            hasRanged = true;
            modifierContextObjects.push(ModifierRanged.createContextObject());
          }
          if (!hasRebirth && minion.hasActiveModifierClass(ModifierRebirth)) {
            hasRebirth = true;
            modifierContextObjects.push(ModifierRebirth.createContextObject());
          }
          if (!hasRush && minion.hasActiveModifierClass(ModifierFirstBlood)) {
            hasRush = true;
            modifierContextObjects.push(ModifierFirstBlood.createContextObject());
          }
        }
      }
    }
    // if !hasInvulnerable and minion.hasActiveModifierClass(ModifierInvulnerable)
    //   hasInvulnerable = true
    //   modifierContextObjects.push(ModifierInvulnerable.createContextObject())

    if (hasGrow) {
      modifierContextObjects.push(ModifierGrow.createContextObject(growAmount));
    }
    if (hasBackstab) {
      modifierContextObjects.push(ModifierBackstab.createContextObject(backstabAmount));
    }

    return (() => {
      const result = [];
      for (modifier of Array.from<any>(modifierContextObjects)) {
        modifier.durationEndTurn = 1;
        result.push(this.getGameSession().applyModifierContextObject(modifier, general));
      }
      return result;
    })();
  }
}

module.exports = SpellNeurolink;
