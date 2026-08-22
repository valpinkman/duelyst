/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RemoveManaCoreAction = require('@duelyst/sdk/actions/removeManaCoreAction');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierDyingWishDestroyManaCrystal extends ModifierDyingWish {
  declare type: any;
  declare fxResource: any;
  declare amountToRemove: any;
  declare takeFromOwner: any;

  static type = 'ModifierDyingWishDestroyManaCrystal';

  static createContextObject(takeFromOwner, amountToRemove, options) {
    if (takeFromOwner == null) {
      takeFromOwner = false;
    }
    if (amountToRemove == null) {
      amountToRemove = 1;
    }
    const contextObject = super.createContextObject(options);
    contextObject.amountToRemove = amountToRemove;
    contextObject.takeFromOwner = takeFromOwner;
    return contextObject;
  }

  onDyingWish() {
    super.onDyingWish();

    const removeManaCoreAction = new RemoveManaCoreAction(
      this.getGameSession(),
      this.amountToRemove,
    );
    removeManaCoreAction.setSource(this.getCard());
    if (this.takeFromOwner) {
      removeManaCoreAction.setOwnerId(this.getCard().getOwnerId());
    } else {
      removeManaCoreAction.setOwnerId(
        this.getGameSession().getOpponentPlayerIdOfPlayerId(this.getCard().getOwnerId()),
      );
    }
    return this.getGameSession().executeAction(
      this.getGameSession().executeAction(removeManaCoreAction),
    );
  }
}
ModifierDyingWishDestroyManaCrystal.prototype.type = 'ModifierDyingWishDestroyManaCrystal';
ModifierDyingWishDestroyManaCrystal.prototype.fxResource = ['FX.Modifiers.ModifierDyingWish'];
ModifierDyingWishDestroyManaCrystal.prototype.amountToRemove = 1;
ModifierDyingWishDestroyManaCrystal.prototype.takeFromOwner = false;

module.exports = ModifierDyingWishDestroyManaCrystal;
