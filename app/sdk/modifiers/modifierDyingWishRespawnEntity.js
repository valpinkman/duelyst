/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierDyingWishRespawnEntity extends ModifierDyingWish {
  static type = 'ModifierDyingWishRespawnEntity';
  static modifierName = 'Dying Wish';
  static description = 'Dying Wish: Resummon this minion';

  onDyingWish(action) {
    super.onDyingWish(action);

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const spawnAction = new PlayCardSilentlyAction(this.getGameSession(), this.getCard().getOwnerId(), this.getCard().getPosition().x, this.getCard().getPosition().y, this.getCard().createNewCardData());
      spawnAction.setSource(this.getCard());
      return this.getGameSession().executeAction(spawnAction);
    }
  }
}
ModifierDyingWishRespawnEntity.prototype.type = 'ModifierDyingWishRespawnEntity';
ModifierDyingWishRespawnEntity.prototype.fxResource = ['FX.Modifiers.ModifierDyingWish', 'FX.Modifiers.ModifierGenericSpawn'];

module.exports = ModifierDyingWishRespawnEntity;
