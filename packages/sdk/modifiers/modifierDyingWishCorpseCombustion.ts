/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('@duelyst/common/config');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const UtilsPosition = require('@duelyst/common/utils/utils_position');
const PlayCardSilentlyAction = require('@duelyst/sdk/actions/playCardSilentlyAction');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierDyingWishCorpseCombustion extends ModifierDyingWish {
  declare type: any;
  declare damageAmount: any;
  declare fxResource: any;
  declare cardDataOrIndexToSpawn: any;

  static type = 'ModifierDyingWishCorpseCombustion';
  static modifierName = 'Dying Wish';
  static description = 'Resummon this minion and deal 3 damage to all nearby enemies';

  onDyingWish(action) {
    super.onDyingWish(action);

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      // deal damage to nearby enemies
      this.getGameSession().executeAction(playCardAction);
      const entities = this.getGameSession()
        .getBoard()
        .getEnemyEntitiesAroundEntity(this.getCard(), CardType.Unit, 1);
      for (var entity of Array.from<any>(entities)) {
        var damageAction = new DamageAction(this.getGameSession());
        damageAction.setOwnerId(this.getCard().getOwnerId());
        damageAction.setSource(this.getCard());
        damageAction.setTarget(entity);
        damageAction.setDamageAmount(this.damageAmount);
        this.getGameSession().executeAction(damageAction);
      }

      // respawn original card
      const cardData = { id: this.getCard().getId() };
      var playCardAction = new PlayCardSilentlyAction(
        this.getGameSession(),
        this.getCard().getOwnerId(),
        this.getCard().getPosition().x,
        this.getCard().getPosition().y,
        cardData,
      );
      playCardAction.setSource(this.getCard());
      return this.getGameSession().executeAction(playCardAction);
    }
  }
}
ModifierDyingWishCorpseCombustion.prototype.type = 'ModifierDyingWishCorpseCombustion';
ModifierDyingWishCorpseCombustion.prototype.damageAmount = 3;
ModifierDyingWishCorpseCombustion.prototype.fxResource = [
  'FX.Modifiers.ModifierDyingWish',
  'FX.Modifiers.ModifierGenericSpawn',
  'FX.Modifiers.ModifierGenericDamage',
];
ModifierDyingWishCorpseCombustion.prototype.cardDataOrIndexToSpawn = null;

module.exports = ModifierDyingWishCorpseCombustion;
