/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierDyingWishInfest extends ModifierDyingWish {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierDyingWishInfest';

  onDyingWish() {
    const general = this.getCard()
      .getGameSession()
      .getGeneralForPlayerId(this.getCard().getOwnerId());

    const damageAction = new DamageAction(this.getGameSession());
    damageAction.setOwnerId(this.getCard().getOwnerId());
    damageAction.setSource(this.getCard());
    damageAction.setTarget(general);
    damageAction.setDamageAmount(2);
    this.getGameSession().executeAction(damageAction);

    const nearbyAllies = this.getGameSession()
      .getBoard()
      .getFriendlyEntitiesAroundEntity(this.getCard(), CardType.Unit, 1);
    return (() => {
      const result = [];
      for (var entity of Array.from<any>(nearbyAllies)) {
        if (entity != null && !entity.getIsGeneral()) {
          var deathPlagueModifier = ModifierDyingWishInfest.createContextObject();
          deathPlagueModifier.appliedName = 'Death Plague';
          deathPlagueModifier.appliedDescription =
            'When this dies, deals 2 damage to your General, then spreads to nearby friendly minions.';
          result.push(
            this.getGameSession().applyModifierContextObject(deathPlagueModifier, entity),
          );
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
}
ModifierDyingWishInfest.prototype.type = 'ModifierDyingWishInfest';
ModifierDyingWishInfest.prototype.fxResource = [
  'FX.Modifiers.ModifierInfest',
  'FX.Modifiers.ModifierGenericChain',
];

module.exports = ModifierDyingWishInfest;
