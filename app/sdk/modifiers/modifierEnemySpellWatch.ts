/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardFromHandAction = require('app/sdk/actions/playCardFromHandAction');
const PlaySignatureCardAction = require('app/sdk/actions/playSignatureCardAction');
const CardType = require('app/sdk/cards/cardType');
const Modifier = require('./modifier');

class ModifierEnemySpellWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierEnemySpellWatch';
  static modifierName = 'Enemy Spell Watch';
  static description = 'Enemy Spell Watch';

  onBeforeAction(e) {
    super.onBeforeAction(e);

    const { action } = e;

    // watch for a spell (but not a followup) being cast by player who owns this entity
    if (
      (action instanceof PlayCardFromHandAction || action instanceof PlaySignatureCardAction) &&
      action.getOwnerId() !== this.getCard().getOwnerId() &&
      __guard__(action.getCard(), (x) => x.type) === CardType.Spell
    ) {
      return this.onEnemySpellWatch(action);
    }
  }

  onEnemySpellWatch(action) {}
}
ModifierEnemySpellWatch.prototype.type = 'ModifierEnemySpellWatch';
ModifierEnemySpellWatch.prototype.activeInHand = false;
ModifierEnemySpellWatch.prototype.activeInDeck = false;
ModifierEnemySpellWatch.prototype.activeInSignatureCards = false;
ModifierEnemySpellWatch.prototype.activeOnBoard = true;
ModifierEnemySpellWatch.prototype.fxResource = ['FX.Modifiers.ModifierSpellWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierEnemySpellWatch;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
