/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ApplyCardToBoardAction = require('@duelyst/sdk/actions/applyCardToBoardAction');
const Modifier = require('./modifier');

class ModifierIntensify extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;

  static type = 'ModifierIntensify';
  static isKeyworded = true;
  static modifierName = 'Intensify';
  static description = null;
  static keywordDefinition = 'Effect is boosted each time you play it.';

  getIsActionRelevant(action) {
    // watch for instances of playing this card
    if (
      action instanceof ApplyCardToBoardAction &&
      action.getOwnerId() === this.getOwnerId() &&
      action.getCard().getBaseCardId() === this.getCard().getBaseCardId()
    ) {
      return true;
    }
    return false;
  }

  getIntensifyAmount() {
    let amount = 0;
    const relevantActions = this.getGameSession().filterActions(
      this.getIsActionRelevant.bind(this),
    );
    if (relevantActions != null) {
      amount = relevantActions.length;
    }
    return amount;
  }

  onActivate() {
    super.onActivate();
    return this.onIntensify();
  }

  onIntensify() {}
}
ModifierIntensify.prototype.type = 'ModifierIntensify';
ModifierIntensify.prototype.activeInHand = false;
ModifierIntensify.prototype.activeInDeck = false;
ModifierIntensify.prototype.activeInSignatureCards = false;
ModifierIntensify.prototype.activeOnBoard = true;
// override me in sub classes to implement special behavior

module.exports = ModifierIntensify;
