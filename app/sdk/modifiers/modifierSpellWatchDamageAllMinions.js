/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const ModifierSpellWatch = require('./modifierSpellWatch');

class ModifierSpellWatchDamageAllMinions extends ModifierSpellWatch {
  static type = 'ModifierSpellWatchDamageAllMinions';
  static modifierName = 'Spell Watch (Damage All Minions)';
  static description = 'Whenever you cast a spell, deal %X damage to ALL minions';

  static createContextObject(damageAmount, options) {
    const contextObject = super.createContextObject(options);
    contextObject.damageAmount = damageAmount;
    return contextObject;
  }

  onSpellWatch(action) {
    super.onSpellWatch(action);

    const board = this.getGameSession().getBoard();

    return (() => {
      const result = [];
      for (var unit of Array.from(board.getUnits(true, false))) {
        if ((unit != null) && !unit.getIsGeneral()) {
          var damageAction = new DamageAction(this.getGameSession());
          damageAction.setOwnerId(this.getCard().getOwnerId());
          damageAction.setSource(this.getCard());
          damageAction.setDamageAmount(this.damageAmount);
          damageAction.setTarget(unit);
          result.push(this.getGameSession().executeAction(damageAction));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
}
ModifierSpellWatchDamageAllMinions.prototype.type = 'ModifierSpellWatchDamageAllMinions';
ModifierSpellWatchDamageAllMinions.prototype.damageAmount = 0;
ModifierSpellWatchDamageAllMinions.prototype.fxResource = ['FX.Modifiers.ModifierSpellWatch', 'FX.Modifiers.ModifierGenericChainLightning'];

module.exports = ModifierSpellWatchDamageAllMinions;
