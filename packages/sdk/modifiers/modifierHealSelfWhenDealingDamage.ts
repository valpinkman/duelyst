/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('@duelyst/common/logger');
const HealAction = require('@duelyst/sdk/actions/healAction');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const Modifier = require('./modifier');

class ModifierHealSelfWhenDealingDamage extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;

  static type = 'ModifierHealSelfWhenDealingDamage';
  static description = 'Whenever this deals damage, restore that much Health to it';

  onBeforeAction(event) {
    super.onBeforeAction(event);
    const { action } = event;
    if (action instanceof DamageAction && action.getSource() === this.getCard()) {
      if (this.getCard().getHP() < this.getCard().getMaxHP()) {
        const healAction = this.getCard().getGameSession().createActionForType(HealAction.type);
        healAction.setTarget(this.getCard());
        let damageToHeal = action.getTotalDamageAmount();
        if (damageToHeal > this.getCard().getDamage()) {
          damageToHeal = this.getCard().getDamage();
        }
        healAction.setHealAmount(damageToHeal);
        return this.getCard().getGameSession().executeAction(healAction);
      }
    }
  }
}
ModifierHealSelfWhenDealingDamage.prototype.type = 'ModifierHealSelfWhenDealingDamage';
ModifierHealSelfWhenDealingDamage.prototype.activeInHand = false;
ModifierHealSelfWhenDealingDamage.prototype.activeInDeck = false;
ModifierHealSelfWhenDealingDamage.prototype.activeInSignatureCards = false;
ModifierHealSelfWhenDealingDamage.prototype.activeOnBoard = true;

module.exports = ModifierHealSelfWhenDealingDamage;
