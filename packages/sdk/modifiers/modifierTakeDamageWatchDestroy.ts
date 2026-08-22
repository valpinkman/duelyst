/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const KillAction = require('@duelyst/sdk/actions/killAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const ModifierTakeDamageWatch = require('./modifierTakeDamageWatch');

class ModifierTakeDamageWatchDestroy extends ModifierTakeDamageWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierTakeDamageWatchDestroy';
  static modifierName = 'Take Damage Watch';
  static description = 'Destroy any minion that deals damage to this one';

  onDamageTaken(action) {
    super.onDamageTaken(action);

    // go back to closest source card that is a unit
    const sourceCard = __guard__(action.getSource(), (x) => x.getAncestorCardOfType(CardType.Unit));

    // kill any minion that damages this one
    if (sourceCard != null && !sourceCard.getIsGeneral()) {
      const target = sourceCard;
      const killAction = new KillAction(this.getGameSession());
      killAction.setOwnerId(this.getCard().getOwnerId());
      killAction.setSource(this.getCard());
      killAction.setTarget(target);
      return this.getGameSession().executeAction(killAction);
    }
  }
}
ModifierTakeDamageWatchDestroy.prototype.type = 'ModifierTakeDamageWatchDestroy';
ModifierTakeDamageWatchDestroy.prototype.fxResource = ['FX.Modifiers.ModifierTakeDamageWatch'];

module.exports = ModifierTakeDamageWatchDestroy;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
