/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DieAction = require('app/sdk/actions/dieAction');
const Modifier = require('./modifier');

class ModifierOnDying extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;

  static type = 'ModifierOnDying';

  onAction(e) {
    super.onAction(e);

    const { action } = e;

    // when our entity has died
    if (
      action instanceof DieAction &&
      action.getTarget() === this.getCard() &&
      this.getCard().getIsRemoved()
    ) {
      return this.onDying(action);
    }
  }

  onDying(action) {}
}
ModifierOnDying.prototype.type = 'ModifierOnDying';
ModifierOnDying.prototype.activeInHand = false;
ModifierOnDying.prototype.activeInDeck = false;
ModifierOnDying.prototype.activeInSignatureCards = false;
ModifierOnDying.prototype.activeOnBoard = true;
// override me in sub classes to implement special behavior

module.exports = ModifierOnDying;
