/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const PlayCardFromHandAction = require('app/sdk/actions/playCardFromHandAction');
const Modifier = require('./modifier');

class ModifierAnySummonWatchFromActionBar extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierAnySummonWatchFromActionBar';
  static modifierName = 'Any Summon Watch From Action Bar';
  static description = 'Any Summon Watch From Action Bar';

  onAction(e) {
    super.onAction(e);

    const { action } = e;

    if (this.getIsActionRelevant(action)) {
      return this.onSummonWatch(action);
    }
  }

  getIsActionRelevant(a) {
    // watch for a unit being summoned from action bar by any player (except self)
    if (a instanceof PlayCardFromHandAction) {
      const card = a.getCard();
      return card != null && card.type === CardType.Unit && card !== this.getCard();
    }
  }

  onSummonWatch(action?) {}
  // override me in sub classes to implement special behavior

  onActivate() {
    // special check on activation in case this card is created mid-game
    // need to check all actions that occured this gamesession for triggers
    const summonActions = this.getGameSession().filterActions(this.getIsActionRelevant.bind(this));
    return Array.from<any>(summonActions).map((action) => this.onSummonWatch(action));
  }
}
ModifierAnySummonWatchFromActionBar.prototype.type = 'ModifierAnySummonWatchFromActionBar';
ModifierAnySummonWatchFromActionBar.prototype.activeInHand = false;
ModifierAnySummonWatchFromActionBar.prototype.activeInDeck = false;
ModifierAnySummonWatchFromActionBar.prototype.activeInSignatureCards = false;
ModifierAnySummonWatchFromActionBar.prototype.activeOnBoard = true;
ModifierAnySummonWatchFromActionBar.prototype.fxResource = [
  'FX.Modifiers.ModifierAnySummonWatchFromActionBar',
];

module.exports = ModifierAnySummonWatchFromActionBar;
