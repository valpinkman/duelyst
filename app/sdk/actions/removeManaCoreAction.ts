/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Action = require('./action');

class RemoveManaCoreAction extends Action {
  declare manaAmount: any;

  static type = 'RemoveManaCoreAction';

  constructor(gameSession, manaAmount) {
    if (manaAmount == null) {
      manaAmount = 0;
    }
    super(gameSession);
    this.manaAmount = manaAmount;
  }

  _execute() {
    super._execute();

    const owner = this.getOwner();
    if (owner != null) {
      return (() => {
        const result = [];
        for (
          let i = 0, end = this.manaAmount, asc = end >= 0;
          asc ? i < end : i > end;
          asc ? i++ : i--
        ) {
          if (owner.getMaximumMana() > 0) {
            result.push(owner.maximumMana--);
          } else {
            result.push(undefined);
          }
        }
        return result;
      })();
    }
  }

  getManaAmount() {
    return this.manaAmount;
  }

  setManaAmount(manaAmount) {
    return (this.manaAmount = Math.max(manaAmount, 0));
  }
}
RemoveManaCoreAction.prototype.manaAmount = 0;

module.exports = RemoveManaCoreAction;
