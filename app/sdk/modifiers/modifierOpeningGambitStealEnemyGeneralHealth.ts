/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const HealAction = require('app/sdk/actions/healAction');
const DamageAction = require('app/sdk/actions/damageAction');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitStealEnemyGeneralHealth extends ModifierOpeningGambit {
  declare type: any;
  declare fxResource: any;
  declare damageAmount: any;

  static type = 'ModifierOpeningGambitStealEnemyGeneralHealth';
  static description = 'Your General steals X Health from the enemy General';

  static createContextObject(damageAmount, options) {
    const contextObject = super.createContextObject();
    contextObject.damageAmount = damageAmount;
    return contextObject;
  }

  onOpeningGambit() {
    const general = this.getCard()
      .getGameSession()
      .getGeneralForPlayerId(this.getCard().getOwnerId());

    const healAction = new HealAction(this.getGameSession());
    healAction.setOwnerId(this.getOwnerId());
    healAction.setTarget(general);
    healAction.setHealAmount(this.damageAmount);
    this.getGameSession().executeAction(healAction);

    const enemyGeneral = this.getCard()
      .getGameSession()
      .getGeneralForPlayerId(
        this.getGameSession().getOpponentPlayerIdOfPlayerId(this.getCard().getOwnerId()),
      );

    const damageAction = new DamageAction(this.getGameSession());
    damageAction.setOwnerId(this.getOwnerId());
    damageAction.setTarget(enemyGeneral);
    damageAction.setDamageAmount(this.damageAmount);
    return this.getGameSession().executeAction(damageAction);
  }
}
ModifierOpeningGambitStealEnemyGeneralHealth.prototype.type =
  'ModifierOpeningGambitStealEnemyGeneralHealth';
ModifierOpeningGambitStealEnemyGeneralHealth.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
];
ModifierOpeningGambitStealEnemyGeneralHealth.prototype.damageAmount = 0;

module.exports = ModifierOpeningGambitStealEnemyGeneralHealth;
