/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const CardType = require('app/sdk/cards/cardType');
const ModifierOpeningGambit = require('./modifierOpeningGambit');
const Modifier = require('./modifier');

class ModifierOpeningGambitDamageNearbyForAttack extends ModifierOpeningGambit {
  static type = 'ModifierOpeningGambitDamageNearbyForAttack';
  static modifierName = 'Opening Gambit';
  static description = 'ALL nearby minions deal damage to themselves equal to their Attack';

  onOpeningGambit() {
    return (() => {
      const result = [];
      for (var entity of Array.from(this.getGameSession().getBoard().getEntitiesAroundEntity(this.getCard(), CardType.Unit, 1))) {
        if (!entity.getIsGeneral()) { // this ability only damages minions, not Generals
          var damageAction = new DamageAction(this.getGameSession());
          damageAction.setOwnerId(this.getCard().getOwnerId());
          // source and target are same because minion deals damage to itself
          damageAction.setSource(entity);
          damageAction.setTarget(entity);
          damageAction.setDamageAmount(entity.getATK());
          result.push(this.getGameSession().executeAction(damageAction));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
}
ModifierOpeningGambitDamageNearbyForAttack.prototype.type = 'ModifierOpeningGambitDamageNearbyForAttack';
ModifierOpeningGambitDamageNearbyForAttack.prototype.targetType = CardType.Unit;
ModifierOpeningGambitDamageNearbyForAttack.prototype.fxResource = ['FX.Modifiers.ModifierOpeningGambit', 'FX.Modifiers.ModifierGenericDamageNearby'];

module.exports = ModifierOpeningGambitDamageNearbyForAttack;
