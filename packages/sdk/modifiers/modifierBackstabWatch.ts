/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const AttackAction = require('@duelyst/sdk/actions/attackAction');
const Modifier = require('./modifier');
const ModifierBackstab = require('./modifierBackstab');
const ModifierAlwaysBackstabbed = require('./modifierAlwaysBackstabbed');

class ModifierBackstabWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;

  static type = 'ModifierBackstabWatch';
  static modifierName = 'Backstab Watch: Self';
  static description = 'Backstab Watch: Self';

  static createContextObject(options) {
    const contextObject = super.createContextObject(options);
    return contextObject;
  }

  getIsActionRelevant(a) {
    const target = a.getTarget();
    const card = this.getCard();
    if (card != null && target != null && a.getSource() === card) {
      return (
        target.hasActiveModifierClass(ModifierAlwaysBackstabbed) ||
        (card.hasModifierType(ModifierBackstab.type) &&
          a instanceof AttackAction &&
          this.getGameSession()
            .getBoard()
            .getIsPositionBehindEntity(target, card.getPosition(), 1, 0))
      );
    }
    return false;
  }

  onAction(event) {
    super.onAction(event);
    const { action } = event;
    if (this.getIsActionRelevant(action)) {
      return this.onBackstabWatch(action);
    }
  }

  onBackstabWatch(action) {}
}
ModifierBackstabWatch.prototype.type = 'ModifierBackstabWatch';
ModifierBackstabWatch.prototype.activeInHand = false;
ModifierBackstabWatch.prototype.activeInDeck = false;
ModifierBackstabWatch.prototype.activeInSignatureCards = false;
ModifierBackstabWatch.prototype.activeOnBoard = true;
// override me in sub classes to implement special behavior

module.exports = ModifierBackstabWatch;
