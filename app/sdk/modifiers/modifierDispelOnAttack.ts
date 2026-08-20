/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const AttackAction = require('app/sdk/actions/attackAction');
const CardType = require('app/sdk/cards/cardType');
const i18next = require('i18next');
const ModifierSilence = require('./modifierSilence');
const Modifier = require('./modifier');

/*
This is purposely not a subclass of myAttackWatch, because this dispel should occur
on beforeAction, rather than onAction
*/

class ModifierDispelOnAttack extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare maxStacks: any;

  static type = 'ModifierDispelOnAttack';

  onBeforeAction(actionEvent) {
    super.onBeforeAction(actionEvent);
    // dispel target before attack action so that it cannot do onAttack actions
    // example: this dispel disables strikeback before it can counter attack
    const a = actionEvent.action;
    if (a instanceof AttackAction && a.getSource() === this.getCard()) {
      return this.getGameSession().applyModifierContextObject(
        ModifierSilence.createContextObject(),
        a.getTarget(),
      );
    }
  }
}
ModifierDispelOnAttack.prototype.type = 'ModifierDispelOnAttack';
ModifierDispelOnAttack.prototype.activeInHand = false;
ModifierDispelOnAttack.prototype.activeInDeck = false;
ModifierDispelOnAttack.prototype.activeInSignatureCards = false;
ModifierDispelOnAttack.prototype.activeOnBoard = true;
ModifierDispelOnAttack.prototype.maxStacks = 1;

module.exports = ModifierDispelOnAttack;
