/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('@duelyst/common/config');
const HealAction = require('@duelyst/sdk/actions/healAction');

const i18next = require('i18next');
const ModifierBanded = require('./modifierBanded');

class ModifierBandedHeal extends ModifierBanded {
  declare type: any;
  declare fxResource: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierBandedHeal';

  onEndTurn() {
    super.onEndTurn();

    if (
      this.getGameSession().getCurrentPlayer() === this.getCard().getOwner() &&
      this.getCard().getHP() < this.getCard().getMaxHP()
    ) {
      const healAction = this.getCard().getGameSession().createActionForType(HealAction.type);
      healAction.setTarget(this.getCard());
      healAction.setHealAmount(this.getCard().getMaxHP() - this.getCard().getHP());
      return this.getCard().getGameSession().executeAction(healAction);
    }
  }
}
ModifierBandedHeal.prototype.type = 'ModifierBandedHeal';
ModifierBandedHeal.modifierName = i18next.t('modifiers.banded_heal_name');
ModifierBandedHeal.description = i18next.t('modifiers.banded_heal_desc');
ModifierBandedHeal.prototype.fxResource = [
  'FX.Modifiers.ModifierZealed',
  'FX.Modifiers.ModifierZealedHeal',
];

module.exports = ModifierBandedHeal;
