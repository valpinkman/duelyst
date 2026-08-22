/*
 * decaffeinate suggestions:
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const ModifierImmuneToDamage = require('./modifierImmuneToDamage');

class ModifierImmuneToDamageByWeakerEnemies extends ModifierImmuneToDamage {
  declare type: any;
  declare includeGenerals: any;

  static type = 'ModifierImmuneToDamageByWeakerEnemies';

  static createContextObject(includeGenerals, options) {
    const contextObject = super.createContextObject(options);
    contextObject.includeGenerals = includeGenerals;
    return contextObject;
  }

  getIsActionRelevant(a) {
    return (
      this.getCard() != null &&
      a instanceof DamageAction &&
      a.getIsValid() &&
      this.getCard() === a.getTarget() &&
      __guard__(a.getSource(), (x) => x.getType()) === CardType.Unit &&
      (this.includeGenerals || !a.getSource().getIsGeneral()) &&
      a.getSource().getATK() < a.getTarget().getATK()
    );
  }
}
ModifierImmuneToDamageByWeakerEnemies.prototype.type = 'ModifierImmuneToDamageByWeakerEnemies';
ModifierImmuneToDamageByWeakerEnemies.prototype.includeGenerals = false;

module.exports = ModifierImmuneToDamageByWeakerEnemies;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
