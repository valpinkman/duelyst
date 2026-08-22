/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitDamageEverything extends ModifierOpeningGambit {
  declare type: any;
  declare damageAmount: any;
  declare includeSelf: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitDamageEverything';

  static createContextObject(damageAmount, includeSelf, options) {
    if (damageAmount == null) {
      damageAmount = 1;
    }
    if (includeSelf == null) {
      includeSelf = false;
    }
    const contextObject = super.createContextObject(options);
    contextObject.damageAmount = damageAmount;
    contextObject.includeSelf = includeSelf;
    return contextObject;
  }

  onOpeningGambit(action) {
    return (() => {
      const result = [];
      for (var unit of Array.from<any>(this.getGameSession().getBoard().getUnits())) {
        if (this.includeSelf || unit !== this.getCard()) {
          var damageAction = new DamageAction(this.getGameSession());
          damageAction.setOwnerId(this.getCard().getOwnerId());
          damageAction.setSource(this.getCard());
          damageAction.setTarget(unit);
          damageAction.setDamageAmount(this.damageAmount);
          result.push(this.getGameSession().executeAction(damageAction));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
}
ModifierOpeningGambitDamageEverything.prototype.type = 'ModifierOpeningGambitDamageEverything';
ModifierOpeningGambitDamageEverything.prototype.damageAmount = 1;
ModifierOpeningGambitDamageEverything.prototype.includeSelf = false;
ModifierOpeningGambitDamageEverything.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
  'FX.Modifiers.ModifierGenericDamage',
];

module.exports = ModifierOpeningGambitDamageEverything;
