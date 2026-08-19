/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RefreshExhaustionAction = require('app/sdk/actions/refreshExhaustionAction');
const Modifier = require('./modifier');
const ModifierFirstBlood = require('./modifierFirstBlood');

class ModifierInvalidateRush extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierInvalidateRush';
  static modifierName = 'ModifierInvalidateRush';
  static description = 'Whenever ANY player summons a minion with Rush, exhaust it';

  onValidateAction(actionEvent) {
    super.onValidateAction(actionEvent);

    const {
      action,
    } = actionEvent;
    // block refresh exhaustion actions triggered by a Rush modifier
    // note: we have to check against gamesession triggering modifier here since this is pre-validation, triggering modifier relationship is not yet set
    if (action instanceof RefreshExhaustionAction && !__guard__(action.getTarget(), (x) => x.getIsGeneral()) && this.getGameSession().getTriggeringModifier() instanceof ModifierFirstBlood) {
      return this.invalidateAction(action);
    }
  }
}
ModifierInvalidateRush.prototype.type = 'ModifierInvalidateRush';
ModifierInvalidateRush.prototype.activeInHand = false;
ModifierInvalidateRush.prototype.activeInDeck = false;
ModifierInvalidateRush.prototype.activeInSignatureCards = false;
ModifierInvalidateRush.prototype.activeOnBoard = true;
ModifierInvalidateRush.prototype.fxResource = ['FX.Modifiers.ModifierInvalidateRush'];

module.exports = ModifierInvalidateRush;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
