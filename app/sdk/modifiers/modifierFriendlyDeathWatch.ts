/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DieAction = require('app/sdk/actions/dieAction');
const CardType = require('app/sdk/cards/cardType');
const Modifier = require('./modifier');

class ModifierFriendlyDeathWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierFriendlyDeathWatch';
  static modifierName = 'ModifierFriendlyDeathWatch';
  static description = 'Whenever a friendly minion dies...';

  onAfterCleanupAction(e) {
    super.onAfterCleanupAction(e);

    const { action } = e;
    const target = action.getTarget();
    const entity = this.getCard();
    // watch for a friendly unit dying
    if (
      action instanceof DieAction &&
      (target != null ? target.type : undefined) === CardType.Unit &&
      target !== entity &&
      target.getOwnerId() === entity.getOwnerId()
    ) {
      return this.onFriendlyDeathWatch(action);
    }
  }

  onFriendlyDeathWatch(action) {}
}
ModifierFriendlyDeathWatch.prototype.type = 'ModifierFriendlyDeathWatch';
ModifierFriendlyDeathWatch.prototype.activeInHand = false;
ModifierFriendlyDeathWatch.prototype.activeInDeck = false;
ModifierFriendlyDeathWatch.prototype.activeInSignatureCards = false;
ModifierFriendlyDeathWatch.prototype.activeOnBoard = true;
ModifierFriendlyDeathWatch.prototype.fxResource = ['FX.Modifiers.ModifierFriendlyDeathwatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierFriendlyDeathWatch;
