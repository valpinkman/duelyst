/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Action = require('./action');
const CardType = require('@duelyst/sdk/cards/cardType');

class SetDamageAction extends Action {
  declare damageValue: any;

  static type = 'SetDamageAction';

  constructor() {
    super(...arguments);
  }

  _execute() {
    super._execute();

    const source = this.getSource();
    const target = this.getTarget();

    if (target != null) {
      return target.setDamage(this.damageValue);
    }
  }
}
SetDamageAction.prototype.damageValue = 0;

module.exports = SetDamageAction;
