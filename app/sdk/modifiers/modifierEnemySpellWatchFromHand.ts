/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardFromHandAction = require('app/sdk/actions/playCardFromHandAction');
const CardType = require('app/sdk/cards/cardType');
const Modifier = require('./modifier');

class ModifierEnemySpellWatchFromHand extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierEnemySpellWatchFromHand';

  onBeforeAction(e) {
    super.onBeforeAction(e);

    const { action } = e;

    // watch for a spell (but not a followup) being cast by player who owns this entity
    if (
      action instanceof PlayCardFromHandAction &&
      action.getOwnerId() !== this.getCard().getOwnerId() &&
      __guard__(action.getCard(), (x) => x.type) === CardType.Spell
    ) {
      return this.onEnemySpellWatchFromHand(action);
    }
  }

  onEnemySpellWatchFromHand(action) {}
}
ModifierEnemySpellWatchFromHand.prototype.type = 'ModifierEnemySpellWatchFromHand';
ModifierEnemySpellWatchFromHand.prototype.activeInHand = false;
ModifierEnemySpellWatchFromHand.prototype.activeInDeck = false;
ModifierEnemySpellWatchFromHand.prototype.activeInSignatureCards = false;
ModifierEnemySpellWatchFromHand.prototype.activeOnBoard = true;
ModifierEnemySpellWatchFromHand.prototype.fxResource = ['FX.Modifiers.ModifierSpellWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierEnemySpellWatchFromHand;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
