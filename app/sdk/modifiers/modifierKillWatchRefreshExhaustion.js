/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RefreshExhaustionAction = require('app/sdk/actions/refreshExhaustionAction');
const ModifierKillWatch = require('./modifierKillWatch');

class ModifierKillWatchRefreshExhaustion extends ModifierKillWatch {
  static type = 'ModifierKillWatchRefreshExhaustion';

  onKillWatch(action) {
    const refreshExhaustionAction = this.getGameSession().createActionForType(RefreshExhaustionAction.type);
    refreshExhaustionAction.setSource(this.getCard());
    refreshExhaustionAction.setTarget(this.getCard());
    return this.getGameSession().executeAction(refreshExhaustionAction);
  }
}
ModifierKillWatchRefreshExhaustion.prototype.type = 'ModifierKillWatchRefreshExhaustion';
ModifierKillWatchRefreshExhaustion.prototype.fxResource = ['FX.Modifiers.ModifierKillWatch', 'FX.Modifiers.ModifierGenericHeal'];

module.exports = ModifierKillWatchRefreshExhaustion;
