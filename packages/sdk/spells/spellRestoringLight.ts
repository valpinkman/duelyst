/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('@duelyst/common/logger');
const Spell = require('./spell');
const CardType = require('@duelyst/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const HealAction = require('@duelyst/sdk/actions/healAction');

class SpellRestoringLight extends Spell {
  declare targetType: any;
  declare healModifier: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    const general = this.getGameSession().getGeneralForPlayerId(this.getOwnerId());
    const friendlyMinions = board.getFriendlyEntitiesForEntity(general);

    const healAction = new HealAction(this.getGameSession());
    healAction.manaCost = 0;
    healAction.setOwnerId(this.ownerId);
    healAction.setTarget(general);
    healAction.setHealAmount(this.healModifier);
    this.getGameSession().executeAction(healAction);

    return Array.from<any>(friendlyMinions).map((entity) =>
      Array.from<any>(this.getAppliedTargetModifiersContextObjects()).map((modifierContextObject) =>
        this.getGameSession().applyModifierContextObject(modifierContextObject, entity),
      ),
    );
  }

  setNumModifiersToApply(val) {
    return (this.numModifiersToApply = val);
  }

  getNumModifiersToApply() {
    return this.numModifiersToApply;
  }

  getAppliedTargetModifiersContextObjects() {
    let appliedModifiersContextObjects = this.getTargetModifiersContextObjects();
    let numModifiersToPick = this.numModifiersToApply;
    if (numModifiersToPick > 0 && numModifiersToPick < appliedModifiersContextObjects.length) {
      // pick modifiers at random
      const modifierContextObjectsToPickFrom = appliedModifiersContextObjects.slice(0);
      appliedModifiersContextObjects = [];
      while (numModifiersToPick > 0) {
        // pick a modifier and remove it from the list to avoid picking duplicates
        var modifierContextObject = modifierContextObjectsToPickFrom.splice(
          this.getGameSession().getRandomIntegerForExecution(
            modifierContextObjectsToPickFrom.length,
          ),
          1,
        )[0];
        appliedModifiersContextObjects.push(modifierContextObject);
        numModifiersToPick--;
      }
    }

    return appliedModifiersContextObjects;
  }
}
SpellRestoringLight.prototype.targetType = CardType.Unit;
SpellRestoringLight.prototype.healModifier = 3;

module.exports = SpellRestoringLight;
