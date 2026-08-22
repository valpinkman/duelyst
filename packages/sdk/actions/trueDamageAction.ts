/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('./damageAction');
const _ = require('underscore');

/*
  True damage actions cannot be modified in any way and always deals the exact damage initially set in the action.
*/
class TrueDamageAction extends DamageAction {
  static type = 'TrueDamageAction';

  constructor() {
    super(...arguments);
  }

  getTotalDamageAmount() {
    return this.getDamageAmount();
  }
}

module.exports = TrueDamageAction;
