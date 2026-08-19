/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const KillAction = require('app/sdk/actions/killAction');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierDyingWishLoseGame extends ModifierDyingWish {
  static type = 'ModifierDyingWishLoseGame';
  static appliedName = 'Life Link';
  static appliedDescription = '';

  onDyingWish() {
    const general = this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId());
    if (general != null) {
      const killAction = new KillAction(this.getGameSession());
      killAction.setOwnerId(this.getCard().getOwnerId());
      killAction.setSource(this.getCard());
      killAction.setTarget(general);
      return this.getGameSession().executeAction(killAction);
    }
  }
}
ModifierDyingWishLoseGame.prototype.type = 'ModifierDyingWishLoseGame';
ModifierDyingWishLoseGame.prototype.name = 'Dying Wish: Kill General';
ModifierDyingWishLoseGame.prototype.description = 'When this minion dies, your general dies';
ModifierDyingWishLoseGame.prototype.fxResource = ['FX.Modifiers.ModifierDyingWish', 'FX.Modifiers.ModifierGenericDamage'];

module.exports = ModifierDyingWishLoseGame;
