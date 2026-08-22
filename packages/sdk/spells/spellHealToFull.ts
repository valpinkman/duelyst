/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const Spell = require('./spell');
const CardType = require('@duelyst/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const HealAction = require('@duelyst/sdk/actions/healAction');

class SpellHealToFull extends Spell {
  declare targetType: any;
  declare spellFilterType: any;
  declare healModifier: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    const applyEffectPosition = { x, y };
    const entity = board.getCardAtPosition(applyEffectPosition, this.targetType);

    const healAction = new HealAction(this.getGameSession());
    healAction.manaCost = 0;
    healAction.setOwnerId(this.ownerId);
    healAction.setTarget(entity);
    healAction.setHealAmount(entity.getDamage());

    return this.getGameSession().executeAction(healAction);
  }
}
SpellHealToFull.prototype.targetType = CardType.Unit;
SpellHealToFull.prototype.spellFilterType = SpellFilterType.NeutralDirect;
SpellHealToFull.prototype.healModifier = 0;

module.exports = SpellHealToFull;
