/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const HealAction = require('app/sdk/actions/healAction');
const ModifierBuilding = require('./modifierBuilding');

class ModifierBuildCompleteHealGeneral extends ModifierBuilding {
  declare type: any;
  declare healAmount: any;

  static type = 'ModifierBuildCompleteHealGeneral';

  static createContextObject(healAmount, description, transformCardData, turnsToBuild, options) {
    const contextObject = super.createContextObject(
      description,
      transformCardData,
      turnsToBuild,
      options,
    );
    contextObject.healAmount = healAmount;
    return contextObject;
  }

  onBuildComplete() {
    super.onBuildComplete();

    const general = this.getCard()
      .getGameSession()
      .getGeneralForPlayerId(this.getCard().getOwnerId());
    const healAction = new HealAction(this.getGameSession());
    healAction.setOwnerId(this.getCard().getOwnerId());
    healAction.setTarget(general);
    healAction.setHealAmount(this.healAmount);
    return this.getGameSession().executeAction(healAction);
  }
}
ModifierBuildCompleteHealGeneral.prototype.type = 'ModifierBuildCompleteHealGeneral';
ModifierBuildCompleteHealGeneral.prototype.healAmount = 0;

module.exports = ModifierBuildCompleteHealGeneral;
