/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('@duelyst/common/logger');
const Spell = require('./spell');
const CardType = require('@duelyst/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const Modifier = require('@duelyst/sdk/modifiers/modifier');
const _ = require('underscore');

class SpellBuffAttributeByOtherAttribute extends Spell {
  declare targetType: any;
  declare spellFilterType: any;
  declare attributeTarget: any;
  declare attributeSource: any;
  declare appliedName: any;
  declare appliedDescription: any;
  declare durationEndTurn: any;
  declare durationStartTurn: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    const entity = board.getCardAtPosition({ x, y }, this.targetType);
    let attributeTargetAmount = 0;

    switch (this.attributeSource) {
      case 'hp':
        attributeTargetAmount = entity.getHP();
        break;
      case 'maxHP':
        attributeTargetAmount = entity.getMaxHP();
        break;
      case 'atk':
        attributeTargetAmount = entity.getATK();
        break;
    }

    const attributeBuffs = {};
    attributeBuffs[this.attributeTarget] = attributeTargetAmount;
    // Logger.module("SDK").debug "[G:#{@.getGameSession().gameId}]", "SpellBuffAttributeByOtherAttribute::onApplyEffectToBoardTile -> #{x}, #{y} buff entity #{entity.getLogName()} attribute buffs by", attributeBuffs

    // apply modifier to buff attributes
    const contextObject = Modifier.createContextObject();
    contextObject.attributeBuffs = attributeBuffs;
    if (this.appliedName != null) {
      contextObject.appliedName = this.appliedName;
    }
    if (this.appliedDescription != null) {
      contextObject.appliedDescription = this.appliedDescription;
    }
    if (this.durationEndTurn != null) {
      contextObject.durationEndTurn = this.durationEndTurn;
    }
    if (this.durationStartTurn != null) {
      contextObject.durationStartTurn = this.durationStartTurn;
    }
    return this.getGameSession().applyModifierContextObject(contextObject, entity);
  }
}
SpellBuffAttributeByOtherAttribute.prototype.targetType = CardType.Unit;
SpellBuffAttributeByOtherAttribute.prototype.spellFilterType = SpellFilterType.NeutralDirect;
SpellBuffAttributeByOtherAttribute.prototype.attributeTarget = null;
SpellBuffAttributeByOtherAttribute.prototype.attributeSource = null;
SpellBuffAttributeByOtherAttribute.prototype.appliedName = null;
SpellBuffAttributeByOtherAttribute.prototype.appliedDescription = null;
SpellBuffAttributeByOtherAttribute.prototype.durationEndTurn = null;
SpellBuffAttributeByOtherAttribute.prototype.durationStartTurn = null;

module.exports = SpellBuffAttributeByOtherAttribute;
