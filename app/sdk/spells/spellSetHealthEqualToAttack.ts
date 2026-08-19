/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const Spell = require('./spell');
const CardType = require('app/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const Modifier = require('app/sdk/modifiers/modifier');
const _ = require('underscore');

class SpellSetHealthEqualToAttack extends Spell {
  declare targetType: any;
  declare spellFilterType: any;
  declare appliedName: any;
  declare appliedDescription: any;
  declare durationEndTurn: any;
  declare durationStartTurn: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    const entity = board.getCardAtPosition({ x, y }, this.targetType);

    // apply modifier to change health
    const contextObject = Modifier.createContextObject();
    contextObject.attributeBuffs = {};
    contextObject.attributeBuffs.maxHP = entity.getATK(true);
    contextObject.attributeBuffsAbsolute = ['maxHP'];
    contextObject.resetsDamage = true;
    contextObject.isRemovable = false;
    if (this.appliedName != null) { contextObject.appliedName = this.appliedName; }
    if (this.appliedDescription != null) { contextObject.appliedDescription = this.appliedDescription; }
    if (this.durationEndTurn != null) { contextObject.durationEndTurn = this.durationEndTurn; }
    if (this.durationStartTurn != null) { contextObject.durationStartTurn = this.durationStartTurn; }
    return this.getGameSession().applyModifierContextObject(contextObject, entity);
  }
}
SpellSetHealthEqualToAttack.prototype.targetType = CardType.Unit;
SpellSetHealthEqualToAttack.prototype.spellFilterType = SpellFilterType.NeutralDirect;
SpellSetHealthEqualToAttack.prototype.appliedName = null;
SpellSetHealthEqualToAttack.prototype.appliedDescription = null;
SpellSetHealthEqualToAttack.prototype.durationEndTurn = null;
SpellSetHealthEqualToAttack.prototype.durationStartTurn = null;

module.exports = SpellSetHealthEqualToAttack;
