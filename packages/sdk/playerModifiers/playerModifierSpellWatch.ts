/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifier = require('./playerModifier');
const PlayCardFromHandAction = require('@duelyst/sdk/actions/playCardFromHandAction');
const PlaySignatureCardAction = require('@duelyst/sdk/actions/playSignatureCardAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const Stringifiers = require('@duelyst/sdk/helpers/stringifiers');

class PlayerModifierSpellWatch extends PlayerModifier {
  declare type: any;

  static type = 'PlayerModifierSpellWatch';

  onBeforeAction(e) {
    super.onBeforeAction(e);

    const { action } = e;

    // watch for a spell (but not a followup) being cast by player who owns this entity
    if (
      (action instanceof PlayCardFromHandAction || action instanceof PlaySignatureCardAction) &&
      action.getOwnerId() === this.getCard().getOwnerId() &&
      __guard__(action.getCard(), (x) => x.type) === CardType.Spell
    ) {
      return this.onSpellWatch(action);
    }
  }

  onSpellWatch(action) {}
}
PlayerModifierSpellWatch.prototype.type = 'PlayerModifierSpellWatch';
// override me in sub classes to implement special behavior

module.exports = PlayerModifierSpellWatch;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
