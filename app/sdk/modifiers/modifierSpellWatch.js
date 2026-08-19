/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardFromHandAction = require('app/sdk/actions/playCardFromHandAction');
const PlaySignatureCardAction = require('app/sdk/actions/playSignatureCardAction');
const CardType = require('app/sdk/cards/cardType');
const Stringifiers = require('app/sdk/helpers/stringifiers');
const Modifier = require('./modifier');

class ModifierSpellWatch extends Modifier {
  static type = 'ModifierSpellWatch';
  static modifierName = 'Spell Watch';
  static description = 'Spell Watch';

  onBeforeAction(e) {
    super.onBeforeAction(e);

    const {
      action,
    } = e;

    // watch for a spell (but not a followup) being cast by player who owns this entity
    if ((action instanceof PlayCardFromHandAction || action instanceof PlaySignatureCardAction) && (action.getOwnerId() === this.getCard().getOwnerId()) && (__guard__(action.getCard(), (x) => x.type) === CardType.Spell)) {
      return this.onSpellWatch(action);
    }
  }

  onSpellWatch(action) {}
}
ModifierSpellWatch.prototype.type = 'ModifierSpellWatch';
ModifierSpellWatch.prototype.activeInHand = false;
ModifierSpellWatch.prototype.activeInDeck = false;
ModifierSpellWatch.prototype.activeInSignatureCards = false;
ModifierSpellWatch.prototype.activeOnBoard = true;
ModifierSpellWatch.prototype.fxResource = ['FX.Modifiers.ModifierSpellWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierSpellWatch;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
