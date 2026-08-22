/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('@duelyst/common/logger');
const AttackAction = require('@duelyst/sdk/actions/attackAction');
const ForcedAttackAction = require('@duelyst/sdk/actions/forcedAttackAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const Stringifiers = require('@duelyst/sdk/helpers/stringifiers');
const Modifier = require('./modifier');

class ModifierMyAttackWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierMyAttackWatch';
  static modifierName = 'Attack Watch: Self';
  static description = 'Attack Watch: Self';

  onAction(event) {
    super.onAction(event);
    const { action } = event;
    if (
      action.getSource() === this.getCard() &&
      ((action instanceof AttackAction && (!action.getIsImplicit() || action.getIsAutomatic())) ||
        action instanceof ForcedAttackAction)
    ) {
      return this.onMyAttackWatch(action);
    }
  }

  onMyAttackWatch(action) {}
}
ModifierMyAttackWatch.prototype.type = 'ModifierMyAttackWatch';
ModifierMyAttackWatch.prototype.activeInHand = false;
ModifierMyAttackWatch.prototype.activeInDeck = false;
ModifierMyAttackWatch.prototype.activeInSignatureCards = false;
ModifierMyAttackWatch.prototype.activeOnBoard = true;
ModifierMyAttackWatch.prototype.fxResource = ['FX.Modifiers.ModifierMyAttackWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierMyAttackWatch;
