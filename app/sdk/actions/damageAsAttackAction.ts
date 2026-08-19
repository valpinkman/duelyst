/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('./damageAction');

/*
  Damage action that looks like an attack but is not a true attack.
*/
class DamageAsAttackAction extends DamageAction {
  declare damageAmount: any;

  static type = 'DamageAsAttackAction';

  constructor(gameSession) {
    super(gameSession);
  }

  getDamageAmount() {
    // attack damage amount is always source's atk value
    const source = this.getSource();
    if (source != null) { return source.getATK(); } return 0;
  }
}
DamageAsAttackAction.prototype.damageAmount = 0;

module.exports = DamageAsAttackAction;
