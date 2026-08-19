/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const Spell = require('./spell');
const CardType = require('app/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const HealAction = require('app/sdk/actions/healAction');
const DamageAction = require('app/sdk/actions/damageAction');

class SpellHolyImmolation extends Spell {
  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    const applyEffectPosition = { x, y };
    const targetEntity = board.getCardAtPosition(applyEffectPosition, this.targetType);

    // Logger.module("SDK").debug "[G:#{@.getGameSession().gameId}]", "SpellHolyImmolation::onApplyEffectToBoardTile -> immolate #{targetEntity.name}"

    // heal the spell's target (your unit)
    const healAction = new HealAction(this.getGameSession());
    healAction.setOwnerId(this.ownerId);
    healAction.setTarget(targetEntity);
    healAction.setHealAmount(this.healAmount);
    this.getGameSession().executeAction(healAction);

    // damage enemy unit's around your unit
    const entities = board.getEnemyEntitiesAroundEntity(targetEntity, CardType.Unit, 1);
    return (() => {
      const result = [];
      for (var entity of Array.from(entities)) {
        var damageAction = new DamageAction(this.getGameSession());
        damageAction.setOwnerId(targetEntity.getOwnerId());
        damageAction.setSource(this);
        damageAction.setTarget(entity);
        damageAction.setDamageAmount(this.damageAmount);
        result.push(this.getGameSession().executeAction(damageAction));
      }
      return result;
    })();
  }
}
SpellHolyImmolation.prototype.targetType = CardType.Unit;
SpellHolyImmolation.prototype.spellFilterType = SpellFilterType.AllyDirect;
SpellHolyImmolation.prototype.healAmount = 0;
SpellHolyImmolation.prototype.damageAmount = 0;

module.exports = SpellHolyImmolation;
