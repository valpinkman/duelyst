/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardFromHandAction = require('app/sdk/actions/playCardFromHandAction');
const PlaySignatureCardAction = require('app/sdk/actions/playSignatureCardAction');
const CardType = require('app/sdk/cards/cardType');
const Modifier = require('./modifier');

class ModifierSpellWatchAnywhereApplyModifiers extends Modifier {
  static type = 'ModifierSpellWatchAnywhereApplyModifiers';

  static createContextObject(modifiers, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifiers;
    return contextObject;
  }

  onAfterAction(e) {
    super.onAfterAction(e);

    const {
      action,
    } = e;

    // watch for a spell (but not a followup) being cast by player who owns this entity
    if (this.getIsActionRelevant(action)) {
      return this.onSpellWatch(action);
    }
  }

  getIsActionRelevant(action) {
    return (action instanceof PlayCardFromHandAction || action instanceof PlaySignatureCardAction) && (action.getOwnerId() === this.getCard().getOwnerId()) && (__guard__(action.getCard(), (x) => x.type) === CardType.Spell);
  }

  onSpellWatch(action) {
    return this.applyManagedModifiersFromModifiersContextObjects(this.modifiersContextObjects, this.getCard());
  }

  onActivate() {
    // special check on activation in case this card is created mid-game
    // need to check all actions that occured this gamesession for triggers
    const spellActions = this.getGameSession().filterActions(this.getIsActionRelevant.bind(this));
    return Array.from(spellActions).map((action) =>
      this.onSpellWatch(action));
  }
}
ModifierSpellWatchAnywhereApplyModifiers.prototype.type = 'ModifierSpellWatchAnywhereApplyModifiers';
ModifierSpellWatchAnywhereApplyModifiers.prototype.activeInHand = true;
ModifierSpellWatchAnywhereApplyModifiers.prototype.activeInDeck = true;
ModifierSpellWatchAnywhereApplyModifiers.prototype.activeInSignatureCards = true;
ModifierSpellWatchAnywhereApplyModifiers.prototype.activeOnBoard = false;
ModifierSpellWatchAnywhereApplyModifiers.prototype.fxResource = ['FX.Modifiers.ModifierSpellWatch'];

module.exports = ModifierSpellWatchAnywhereApplyModifiers;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
