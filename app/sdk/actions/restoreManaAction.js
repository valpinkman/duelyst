/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Action = require('./action');
const CONFIG = require('app/common/config');

class RestoreManaAction extends Action {
  static type = 'RestoreManaAction';

  constructor(gameSession) {
    super(gameSession);
  }

  setManaAmount(manaToRestore) {
    return this.restoreManaAmount = manaToRestore;
  }

  _execute() {
    super._execute();

    const owner = this.getOwner();
    if (owner != null) {
      if (owner.getRemainingMana() < owner.getMaximumMana()) {
        if ((owner.getRemainingMana() + this.restoreManaAmount) <= owner.getMaximumMana()) {
          return owner.remainingMana += this.restoreManaAmount;
        }
        return owner.remainingMana = owner.getMaximumMana();
      }
    }
  }
}
RestoreManaAction.prototype.restoreManaAmount = 0;

module.exports = RestoreManaAction;
