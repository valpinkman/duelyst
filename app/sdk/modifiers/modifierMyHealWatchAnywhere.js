/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const HealAction = require('app/sdk/actions/healAction');
const Modifier = require('./modifier');

class ModifierMyHealWatchAnywhere extends Modifier {
  static type = 'ModifierMyHealWatchAnywhere';
  static modifierName = 'MyHealWatchAnywhere';
  static description = 'MyHealWatchAnywhere';

  // "heal watchers" are not allowed to proc if they die during the step
  onAfterCleanupAction(e) {
    super.onAfterCleanupAction(e);

    const {
      action,
    } = e;
    if (this.getIsActionRelevant(action)) {
      return this.onHealWatch(action);
    }
  }

  onHealWatch(action) {}
  // override me in sub classes to implement special behavior

  getIsActionRelevant(action) {
    // watch for my action healing something (actually having HP increased by the heal, not just target of a healAction)
    if (action instanceof HealAction && (action.getOwnerId() === this.getCard().getOwnerId()) && (action.getTotalHealApplied() > 0)) {
      return true;
    }
    return false;
  }

  onActivate() {
    // special check on activation in case this card is created mid-game
    // need to check all actions that occured this gamesession for triggers
    const healActions = this.getGameSession().filterActions(this.getIsActionRelevant.bind(this));
    return Array.from(healActions).map((action) =>
      this.onHealWatch(action));
  }
}
ModifierMyHealWatchAnywhere.prototype.type = 'ModifierMyHealWatchAnywhere';
ModifierMyHealWatchAnywhere.prototype.activeInHand = true;
ModifierMyHealWatchAnywhere.prototype.activeInDeck = true;
ModifierMyHealWatchAnywhere.prototype.activeInSignatureCards = false;
ModifierMyHealWatchAnywhere.prototype.activeOnBoard = true;
ModifierMyHealWatchAnywhere.prototype.fxResource = ['FX.Modifiers.ModifierMyHealWatchAnywhere'];

module.exports = ModifierMyHealWatchAnywhere;
