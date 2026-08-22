/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const KillAction = require('@duelyst/sdk/actions/killAction');
const i18next = require('i18next');
const ModifierEndTurnWatch = require('./modifierEndTurnWatch');

class ModifierDoomed extends ModifierEndTurnWatch {
  declare type: any;
  declare fxResource: any;
  declare isRemovable: any;
  declare maxStacks: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierDoomed';

  onTurnWatch() {
    super.onTurnWatch();

    if (this.numEndTurnsElapsed > 1) {
      // don't kill self on same end turn this modifier was applied!
      const entityToKill = this.getCard();
      const killAction = new KillAction(this.getGameSession());
      killAction.setOwnerId(this.getCard().getOwnerId());
      killAction.setSource(
        this.getGameSession().getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId()),
      );
      killAction.setTarget(entityToKill);
      this.getGameSession().executeAction(killAction);
      return this.getGameSession().removeModifier(this);
    }
  }
}
ModifierDoomed.prototype.type = 'ModifierDoomed';
ModifierDoomed.modifierName = i18next.t('modifiers.doomed_name');
ModifierDoomed.description = i18next.t('modifiers.doomed_1_def');
ModifierDoomed.prototype.fxResource = ['FX.Modifiers.ModifierDoomed'];
ModifierDoomed.prototype.isRemovable = false;
ModifierDoomed.prototype.maxStacks = 1;

module.exports = ModifierDoomed;
