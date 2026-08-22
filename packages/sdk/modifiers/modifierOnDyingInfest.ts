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
const ModifierOnDying = require('./modifierOnDying');

class ModifierOnDyingInfest extends ModifierOnDying {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierOnDyingInfest';

  onDying() {
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
          var deathPlagueModifier = ModifierOnDyingInfest.createContextObject();
          deathPlagueModifier.appliedName = this.appliedName;
          deathPlagueModifier.appliedDescription = this.appliedDescription;
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
ModifierOnDyingInfest.prototype.type = 'ModifierOnDyingInfest';
ModifierOnDyingInfest.prototype.fxResource = [
  'FX.Modifiers.ModifierInfest',
  'FX.Modifiers.ModifierGenericChain',
];

module.exports = ModifierOnDyingInfest;
