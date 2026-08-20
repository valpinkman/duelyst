/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ApplyModifierAction = require('app/sdk/actions/applyModifierAction');
const KillAction = require('app/sdk/actions/killAction');
const Modifier = require('./modifier');

class ModifierATKThresholdDie extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierATKThresholdDie';
  static modifierName = 'Modifier ATK Threshold Die';
  static description = "When this unit's attack is greater than %X it dies";

  static createContextObject(atkThreshold, options) {
    const contextObject = super.createContextObject(options);
    contextObject.atkThreshold = atkThreshold;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject != null) {
      return this.description.replace(/%X/, modifierContextObject.atkThreshold);
    }
    return this.description;
  }

  onAction(e) {
    super.onAction(e);

    const { action } = e;

    if (action.getTarget() === this.getCard() && action instanceof ApplyModifierAction) {
      return this.onATKChange(action);
    }
  }

  onATKChange(e) {
    const { action } = e;

    if (this.getCard().getATK() > this.atkThreshold) {
      const killAction = new KillAction(this.getGameSession());
      killAction.setOwnerId(this.getCard().getOwnerId());
      killAction.setSource(this.getCard());
      killAction.setTarget(this.getCard());
      return this.getGameSession().executeAction(killAction);
    }
  }
}
ModifierATKThresholdDie.prototype.type = 'ModifierATKThresholdDie';
ModifierATKThresholdDie.prototype.activeInHand = false;
ModifierATKThresholdDie.prototype.activeInDeck = false;
ModifierATKThresholdDie.prototype.activeInSignatureCards = false;
ModifierATKThresholdDie.prototype.activeOnBoard = true;
ModifierATKThresholdDie.prototype.fxResource = ['FX.Modifiers.ModifierBuffSelfOnReplace'];

module.exports = ModifierATKThresholdDie;
