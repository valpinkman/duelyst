/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('@duelyst/common/logger');
const CONFIG = require('@duelyst/common/config');
const Spell = require('./spell');
const CardType = require('@duelyst/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const HealAction = require('@duelyst/sdk/actions/healAction');

class SpellBreathOfTheUnborn extends Spell {
  declare targetType: any;
  declare spellFilterType: any;
  declare damageAmount: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    const applyEffectPosition = { x, y };
    const unit = board.getCardAtPosition(applyEffectPosition, this.targetType);
    if (unit != null) {
      if (!unit.getIsGeneral()) {
        // never affect Generals
        if (unit.getOwnerId() === this.getOwnerId()) {
          // friendly unit
          if (unit.getDamage() > 0) {
            // only heal if unit is damaged
            const healAction = new HealAction(this.getGameSession());
            healAction.setOwnerId(this.getOwnerId());
            healAction.setTarget(unit);
            healAction.setHealAmount(unit.getDamage()); // heal all damage dealt to this unit
            return this.getGameSession().executeAction(healAction);
          }
        } else {
          const damageAction = new DamageAction(this.getGameSession());
          damageAction.setOwnerId(this.getOwnerId());
          damageAction.setTarget(unit);
          damageAction.setDamageAmount(this.damageAmount);
          return this.getGameSession().executeAction(damageAction);
        }
      }
    }
  }
}
SpellBreathOfTheUnborn.prototype.targetType = CardType.Unit;
SpellBreathOfTheUnborn.prototype.spellFilterType = SpellFilterType.NeutralIndirect;
SpellBreathOfTheUnborn.prototype.damageAmount = 2;

module.exports = SpellBreathOfTheUnborn;
