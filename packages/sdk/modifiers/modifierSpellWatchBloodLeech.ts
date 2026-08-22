/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('@duelyst/common/config');
const CardType = require('@duelyst/sdk/cards/cardType');
const HealAction = require('@duelyst/sdk/actions/healAction');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const Modifier = require('./modifier');
const ModifierSpellWatch = require('./modifierSpellWatch');

class ModifierSpellWatchBloodLeech extends ModifierSpellWatch {
  declare type: any;
  declare damageAmount: any;
  declare healAmount: any;
  declare fxResource: any;

  static type = 'ModifierSpellWatchBloodLeech';

  static createContextObject(damageAmount, healAmount, options) {
    const contextObject = super.createContextObject(options);
    contextObject.damageAmount = damageAmount;
    contextObject.healAmount = healAmount;
    return contextObject;
  }

  onSpellWatch(action) {
    super.onSpellWatch(action);

    const enemyGeneral = this.getCard()
      .getGameSession()
      .getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId());
    const myGeneral = this.getCard()
      .getGameSession()
      .getGeneralForPlayerId(this.getCard().getOwnerId());

    // damage enemy general
    const damageAction = new DamageAction(this.getGameSession());
    damageAction.setOwnerId(this.getCard().getOwnerId());
    damageAction.setSource(this.getCard());
    damageAction.setTarget(enemyGeneral);
    damageAction.setDamageAmount(this.damageAmount);
    this.getGameSession().executeAction(damageAction);

    // heal my general
    const healAction = new HealAction(this.getGameSession());
    healAction.setOwnerId(this.getCard().getOwnerId());
    healAction.setSource(this.getCard());
    healAction.setTarget(myGeneral);
    healAction.setHealAmount(this.healAmount);
    return this.getCard().getGameSession().executeAction(healAction);
  }
}
ModifierSpellWatchBloodLeech.prototype.type = 'ModifierSpellWatchBloodLeech';
ModifierSpellWatchBloodLeech.prototype.damageAmount = 0;
ModifierSpellWatchBloodLeech.prototype.healAmount = 0;
ModifierSpellWatchBloodLeech.prototype.fxResource = [
  'FX.Modifiers.ModifierSpellWatch',
  'FX.Modifiers.ModifierGenericChain',
];

module.exports = ModifierSpellWatchBloodLeech;
