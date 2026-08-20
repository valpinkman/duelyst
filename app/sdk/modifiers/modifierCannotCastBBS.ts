/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardFromHandAction = require('app/sdk/actions/playCardFromHandAction');
const PlaySignatureCardAction = require('app/sdk/actions/playSignatureCardAction');
const CardType = require('app/sdk/cards/cardType');
const ModifierCannot = require('./modifierCannot');

class ModifierCannotCastBBS extends ModifierCannot {
  declare type: any;
  declare manaCostPrevented: any;
  declare fxResource: any;

  static type = 'ModifierCannotCastBBS';
  static modifierName = 'Cannot Cast BBS';
  static description = "Player can't cast Bloodbound Spell.";

  static createContextObject() {
    const contextObject = super.createContextObject();
    return contextObject;
  }

  onValidateAction(actionEvent) {
    const a = actionEvent.action;

    // prevents owner from casting BBS
    if (
      a instanceof PlaySignatureCardAction &&
      a.getOwner() === this.getOwner() &&
      a.getIsValid() &&
      !a.getIsImplicit() &&
      __guard__(a.getCard(), (x) => x.getType()) === CardType.Spell
    ) {
      return this.invalidateAction(a, this.getCard().getPosition(), "You can't cast that!");
    }
  }
}
ModifierCannotCastBBS.prototype.type = 'ModifierCannotCastBBS';
ModifierCannotCastBBS.prototype.manaCostPrevented = 0;
ModifierCannotCastBBS.prototype.fxResource = ['FX.Modifiers.ModifierCannotCastSpellsByCost'];

module.exports = ModifierCannotCastBBS;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
