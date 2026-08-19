/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RemoveAction = require('app/sdk/actions/removeAction');
const PlayCardAsTransformAction = require('app/sdk/actions/playCardAsTransformAction');
const ModifierTransformed = require('app/sdk/modifiers/modifierTransformed');
const HealAction = require('app/sdk/actions/healAction');
const ModifierEnemyStunWatch = require('./modifierEnemyStunWatch');

class ModifierEnemyStunWatchFullyHeal extends ModifierEnemyStunWatch {
  declare type: any;
  declare cardDataOrIndexToSpawn: any;
  declare fxResource: any;

  static type = 'ModifierEnemyStunWatchFullyHeal';

  static createContextObject(options) {
    const contextObject = super.createContextObject(options);
    return contextObject;
  }

  onEnemyStunWatch(action) {
    super.onEnemyStunWatch(action);

    if (this.getCard().getHP() < this.getCard().getMaxHP()) {
      const healAction = this.getCard().getGameSession().createActionForType(HealAction.type);
      healAction.setTarget(this.getCard());
      healAction.setHealAmount(this.getCard().getMaxHP() - this.getCard().getHP());
      return this.getCard().getGameSession().executeAction(healAction);
    }
  }
}
ModifierEnemyStunWatchFullyHeal.prototype.type = 'ModifierEnemyStunWatchFullyHeal';
ModifierEnemyStunWatchFullyHeal.prototype.cardDataOrIndexToSpawn = null;
ModifierEnemyStunWatchFullyHeal.prototype.fxResource = ['FX.Modifiers.ModifierSummonWatch'];

module.exports = ModifierEnemyStunWatchFullyHeal;
