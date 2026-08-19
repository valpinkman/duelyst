/*
 * decaffeinate suggestions:
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ApplyCardToBoardAction = require('app/sdk/actions/applyCardToBoardAction');
const CardType = require('app/sdk/cards/cardType');
const i18next = require('i18next');
const ModifierSentinel = require('./modifierSentinel');

class ModifierSentinelOpponentSpellCast extends ModifierSentinel {
  static type = 'ModifierSentinelOpponentSpellCast';

  static getDescription(modifierContextObject) {
    if (modifierContextObject != null) {
      return this.description;
    }
    return super.getDescription();
  }

  getIsActionRelevant(action) {
    if ((action.getOwner() === this.getGameSession().getOpponentPlayerOfPlayerId(this.getCard().getOwnerId())) && action instanceof ApplyCardToBoardAction && action.getIsValid()) {
      const card = action.getCard();
      // watch for a spell being cast, but ignore followups! (like opening gambits)
      if ((card != null) && (__guard__(card.getRootCard(), (x) => x.type) === CardType.Spell)) {
        return true;
      }
    }
    return false;
  }
}
ModifierSentinelOpponentSpellCast.prototype.type = 'ModifierSentinelOpponentSpellCast';
ModifierSentinelOpponentSpellCast.description = i18next.t('modifiers.sentinel_spell_cast');

module.exports = ModifierSentinelOpponentSpellCast;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
