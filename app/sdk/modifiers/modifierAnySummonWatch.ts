/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const PlayCardAction = require('app/sdk/actions/playCardAction');
const Modifier = require('./modifier');

class ModifierAnySummonWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierAnySummonWatch';
  static modifierName = 'Any Summon Watch';
  static description = 'Any Summon Watch';

  onAction(e) {
    super.onAction(e);

    const { action } = e;

    if (this.getIsActionRelevant(action)) {
      return this.onSummonWatch(action);
    }
  }

  getIsActionRelevant(a) {
    // watch for a unit being summoned by any player (but not this card itself)
    if (a instanceof PlayCardAction) {
      const card = a.getCard();
      return card != null && card.type === CardType.Unit && card !== this.getCard();
    }
  }

  onSummonWatch(action) {}
  // override me in sub classes to implement special behavior

  onActivate() {
    // special check on activation in case this card is created mid-game
    // need to check all actions that occured this gamesession for triggers
    const summonActions = this.getGameSession().filterActions(this.getIsActionRelevant.bind(this));
    return Array.from<any>(summonActions).map((action) => this.onSummonWatch(action));
  }
}
ModifierAnySummonWatch.prototype.type = 'ModifierAnySummonWatch';
ModifierAnySummonWatch.prototype.activeInHand = false;
ModifierAnySummonWatch.prototype.activeInDeck = false;
ModifierAnySummonWatch.prototype.activeInSignatureCards = false;
ModifierAnySummonWatch.prototype.activeOnBoard = true;
ModifierAnySummonWatch.prototype.fxResource = ['FX.Modifiers.ModifierAnySummonWatch'];

module.exports = ModifierAnySummonWatch;
