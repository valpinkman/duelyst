/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardFromHandAction = require('app/sdk/actions/playCardFromHandAction');
const PlaySignatureCardAction = require('app/sdk/actions/playSignatureCardAction');
const DamageAction = require('app/sdk/actions/damageAction');
const CardType = require('app/sdk/cards/cardType');
const Stringifiers = require('app/sdk/helpers/stringifiers');
const Modifier = require('./modifier');

class ModifierSpellDamageWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierSpellDamageWatch';
  static modifierName = 'Spell Damage Watch';
  static description = 'Spell Damage Watch';

  onAction(e) {
    super.onAction(e);

    const { action } = e;

    // watch for a spell (but not a followup) being cast by player who owns this entity
    if (
      (action instanceof PlayCardFromHandAction || action instanceof PlaySignatureCardAction) &&
      action.getOwnerId() === this.getCard().getOwnerId() &&
      __guard__(action.getCard(), (x) => x.type) === CardType.Spell &&
      this.createdDamageSubaction(action)
    ) {
      return this.onDamagingSpellcast(action);
    }
  }

  onDamagingSpellcast(action) {}
  // override me in sub classes to implement special behavior

  createdDamageSubaction(action) {
    // did the spell cast action create a damage subaction directly?
    for (var subAction of Array.from<any>(action.getSubActions())) {
      if (
        subAction.getType() === DamageAction.type &&
        !subAction.getCreatedByTriggeringModifier()
      ) {
        return true;
      }
    }
    return false;
  }
}
ModifierSpellDamageWatch.prototype.type = 'ModifierSpellDamageWatch';
ModifierSpellDamageWatch.prototype.activeInHand = false;
ModifierSpellDamageWatch.prototype.activeInDeck = false;
ModifierSpellDamageWatch.prototype.activeInSignatureCards = false;
ModifierSpellDamageWatch.prototype.activeOnBoard = true;
ModifierSpellDamageWatch.prototype.fxResource = ['FX.Modifiers.ModifierSpellWatch'];

module.exports = ModifierSpellDamageWatch;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
