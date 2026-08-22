/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Cards = require('@duelyst/sdk/cards/cardsLookupComplete');
const CardType = require('@duelyst/sdk/cards/cardType');
const BonusManaAction = require('@duelyst/sdk/actions/bonusManaAction');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierDyingWishBonusMana extends ModifierDyingWish {
  declare type: any;
  declare bonusMana: any;
  declare bonusDuration: any;

  static type = 'ModifierDyingWishBonusMana';
  static modifierName = 'Bonus Mana';
  static description = 'When this entity dies, its owner gains bonus mana';

  onDyingWish() {
    super.onDyingWish();

    // it is possible that this entity will be owned by the game session
    // but lets try to target the player's general
    const general = this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId());
    if (general != null) {
      const action = this.getGameSession().createActionForType(BonusManaAction.type);
      action.setTarget(general);
      action.bonusMana = this.bonusMana;
      action.bonusDuration = this.bonusDuration;
      return this.getGameSession().executeAction(action);
    }
  }
}
ModifierDyingWishBonusMana.prototype.type = 'ModifierDyingWishBonusMana';
ModifierDyingWishBonusMana.prototype.bonusMana = 1;
ModifierDyingWishBonusMana.prototype.bonusDuration = 1;

module.exports = ModifierDyingWishBonusMana;
