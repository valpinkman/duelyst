/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const i18next = require('i18next');
const CONFIG = require('@duelyst/common/config');
const ModifierStartTurnWatch = require('./modifierStartTurnWatch');

class ModifierStartTurnWatchDamageGeneralEqualToMinionsOwned extends ModifierStartTurnWatch {
  declare type: any;
  declare damageAmount: any;
  declare fxResource: any;
  declare static description: any;

  static type = 'ModifierStartTurnWatchDamageGeneralEqualToMinionsOwned';
  static modifierName = 'Turn Watch';

  static createContextObject(options) {
    const contextObject = super.createContextObject(options);
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    return this.description;
  }

  onTurnWatch(action) {
    super.onTurnWatch(action);

    const enemyMinions = this.getGameSession()
      .getBoard()
      .getEnemyEntitiesForEntity(this.getCard(), CardType.Unit);
    const damageAmount = enemyMinions.length - 1; // removing 1 point of damage since the enemy general is included
    const general = this.getGameSession().getGeneralForOpponentOfPlayerId(
      this.getCard().getOwnerId(),
    );
    if (general != null) {
      const damageAction = new DamageAction(this.getGameSession());
      damageAction.setOwnerId(this.getCard().getOwnerId());
      damageAction.setSource(this.getCard());
      damageAction.setTarget(general);
      damageAction.setDamageAmount(damageAmount);
      return this.getGameSession().executeAction(damageAction);
    }
  }
}
ModifierStartTurnWatchDamageGeneralEqualToMinionsOwned.prototype.type =
  'ModifierStartTurnWatchDamageGeneralEqualToMinionsOwned';
ModifierStartTurnWatchDamageGeneralEqualToMinionsOwned.description = i18next.t(
  'modifiers.start_turn_watch_damage_general_equal_to_minions_owned_def',
);
ModifierStartTurnWatchDamageGeneralEqualToMinionsOwned.prototype.damageAmount = 0;
ModifierStartTurnWatchDamageGeneralEqualToMinionsOwned.prototype.fxResource = [
  'FX.Modifiers.ModifierStartTurnWatch',
  'FX.Modifiers.ModifierGenericChainLightningRed',
];

module.exports = ModifierStartTurnWatchDamageGeneralEqualToMinionsOwned;
