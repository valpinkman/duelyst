/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const Stringifiers = require('@duelyst/sdk/helpers/stringifiers');

const CONFIG = require('@duelyst/common/config');
const ModifierStartTurnWatchBuffSelf = require('./modifierStartTurnWatchBuffSelf');

class ModifierStartTurnWatchDamageEnemyGeneralBuffSelf extends ModifierStartTurnWatchBuffSelf {
  declare type: any;
  declare damageAmount: any;
  declare fxResource: any;

  static type = 'ModifierStartTurnWatchDamageEnemyGeneralBuffSelf';
  static modifierName = 'Turn Watch';
  static description =
    'At the start of your turn, deal %X damage to the enemy General and this minion gains %Y';

  static createContextObject(attackBuff, maxHPBuff, damageAmount, options) {
    if (attackBuff == null) {
      attackBuff = 0;
    }
    if (maxHPBuff == null) {
      maxHPBuff = 0;
    }
    const contextObject = super.createContextObject(attackBuff, maxHPBuff, options);
    contextObject.damageAmount = damageAmount;

    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      const subContextObject = modifierContextObject.modifiersContextObjects[0];
      const replaceText = this.description.replace(
        /%Y/,
        Stringifiers.stringifyAttackHealthBuff(
          subContextObject.attributeBuffs.atk,
          subContextObject.attributeBuffs.maxHP,
        ),
      );
      return replaceText.replace(/%X/, modifierContextObject.damageAmount);
    }
    return this.description;
  }

  onTurnWatch(action) {
    // damage enemy General
    const general = this.getGameSession().getGeneralForOpponentOfPlayerId(
      this.getCard().getOwnerId(),
    );
    if (general != null) {
      const damageAction = new DamageAction(this.getGameSession());
      damageAction.setOwnerId(this.getCard().getOwnerId());
      damageAction.setSource(this.getCard());
      damageAction.setTarget(general);
      if (!this.damageAmount) {
        damageAction.setDamageAmount(this.getCard().getATK());
      } else {
        damageAction.setDamageAmount(this.damageAmount);
      }
      this.getGameSession().executeAction(damageAction);
    }

    return super.onTurnWatch(action);
  }
}
ModifierStartTurnWatchDamageEnemyGeneralBuffSelf.prototype.type =
  'ModifierStartTurnWatchDamageEnemyGeneralBuffSelf';
ModifierStartTurnWatchDamageEnemyGeneralBuffSelf.prototype.damageAmount = 0;
ModifierStartTurnWatchDamageEnemyGeneralBuffSelf.prototype.fxResource = [
  'FX.Modifiers.ModifierStartTurnWatch',
  'FX.Modifiers.ModifierGenericDamageFire',
  'FX.Modifiers.ModifierGenericBuff',
];
// then buff self

module.exports = ModifierStartTurnWatchDamageEnemyGeneralBuffSelf;
