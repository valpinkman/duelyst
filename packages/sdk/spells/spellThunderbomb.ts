/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const SpellDamage = require('./spellDamage');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const CardType = require('@duelyst/sdk/cards/cardType');

class SpellThunderbomb extends SpellDamage {
  declare damageAmount: any;
  declare aoeAmount: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    const applyEffectPosition = { x, y };
    const targetEntity = board.getUnitAtPosition(applyEffectPosition);
    const enemyEntities = board.getFriendlyEntitiesAroundEntity(targetEntity, CardType.Unit, 1);

    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    // damage enemy units around target
    return (() => {
      const result = [];
      for (var entity of Array.from<any>(enemyEntities)) {
        var damageAction = new DamageAction(this.getGameSession());
        damageAction.setOwnerId(this.getOwnerId());
        damageAction.setSource(this);
        damageAction.setTarget(entity);
        damageAction.setDamageAmount(this.aoeAmount);
        result.push(this.getGameSession().executeAction(damageAction));
      }
      return result;
    })();
  }
}
SpellThunderbomb.prototype.damageAmount = 3;
SpellThunderbomb.prototype.aoeAmount = 1;

module.exports = SpellThunderbomb;
