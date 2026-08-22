/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const HealAction = require('@duelyst/sdk/actions/healAction');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const ModifierOverwatchMovedNearby = require('./modifierOverwatchMovedNearby');

class ModifierOverwatchMovedNearbyMiniImmolation extends ModifierOverwatchMovedNearby {
  declare type: any;

  static type = 'ModifierOverwatchMovedNearbyMiniImmolation';

  static createContextObject(damageAmount, options) {
    if (damageAmount == null) {
      damageAmount = 0;
    }
    const contextObject = super.createContextObject(options);
    contextObject.damageAmount = damageAmount;
    return contextObject;
  }

  onOverwatch(action) {
    // heal self
    const healAction = new HealAction(this.getGameSession());
    healAction.setOwnerId(this.getCard().getOwnerId());
    healAction.setTarget(this.getCard());
    healAction.setHealAmount(this.getCard().getDamage()); // heal all damage on the unit
    this.getGameSession().executeAction(healAction);

    // damage enemy units around this unit
    const entities = this.getGameSession()
      .getBoard()
      .getEnemyEntitiesAroundEntity(this.getCard(), CardType.Unit, 1);
    return (() => {
      const result = [];
      for (var entity of Array.from<any>(entities)) {
        var damageAction = new DamageAction(this.getGameSession());
        damageAction.setOwnerId(this.getCard().getOwnerId());
        damageAction.setSource(this.getCard());
        damageAction.setTarget(entity);
        damageAction.setDamageAmount(this.damageAmount);
        result.push(this.getGameSession().executeAction(damageAction));
      }
      return result;
    })();
  }
}
ModifierOverwatchMovedNearbyMiniImmolation.prototype.type =
  'ModifierOverwatchMovedNearbyMiniImmolation';

module.exports = ModifierOverwatchMovedNearbyMiniImmolation;
