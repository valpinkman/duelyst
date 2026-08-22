/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardSilentlyAction = require('@duelyst/sdk/actions/playCardSilentlyAction');
const i18next = require('i18next');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierShadowScar extends ModifierDyingWish {
  declare type: any;
  declare fxResource: any;
  declare cardDataOrIndexToSpawn: any;
  declare spawnOwnerId: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierShadowScar';

  static createContextObject(cardDataOrIndexToSpawn, spawnOwnerId, options) {
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToSpawn = cardDataOrIndexToSpawn;
    contextObject.spawnOwnerId = spawnOwnerId;
    return contextObject;
  }

  onDyingWish(action) {
    super.onDyingWish(action);

    if (
      this.getGameSession().getIsRunningAsAuthoritative() &&
      this.cardDataOrIndexToSpawn != null
    ) {
      if (this.spawnOwnerId != null) {
        const playCardAction = new PlayCardSilentlyAction(
          this.getGameSession(),
          this.spawnOwnerId,
          this.getCard().getPositionX(),
          this.getCard().getPositionY(),
          this.cardDataOrIndexToSpawn,
        );
        playCardAction.setSource(this.getCard());
        return this.getGameSession().executeAction(playCardAction);
      }
    }
  }
}
ModifierShadowScar.prototype.type = 'ModifierShadowScar';
ModifierShadowScar.modifierName = i18next.t('modifiers.shadow_scar_name');
ModifierShadowScar.description = i18next.t('modifiers.shadow_scar_def');
ModifierShadowScar.prototype.fxResource = [
  'FX.Modifiers.ModifierDyingWish',
  'FX.Modifiers.ModifierGenericSpawn',
];
ModifierShadowScar.prototype.cardDataOrIndexToSpawn = null;
ModifierShadowScar.prototype.spawnOwnerId = null;

module.exports = ModifierShadowScar;
