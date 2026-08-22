/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardFromHandAction = require('@duelyst/sdk/actions/playCardFromHandAction');
const PlaySignatureCardAction = require('@duelyst/sdk/actions/playSignatureCardAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const ModifierCannot = require('./modifierCannot');

class ModifierEnemyCannotCastBBS extends ModifierCannot {
  declare type: any;
  declare manaCostPrevented: any;
  declare fxResource: any;

  static type = 'ModifierEnemyCannotCastBBS';

  static createContextObject() {
    const contextObject = super.createContextObject();
    return contextObject;
  }

  onValidateAction(actionEvent) {
    const a = actionEvent.action;

    // prevents owner from casting BBS
    if (
      a instanceof PlaySignatureCardAction &&
      a.getOwner() !== this.getOwner() &&
      a.getIsValid() &&
      !a.getIsImplicit() &&
      __guard__(a.getCard(), (x) => x.getType()) === CardType.Spell
    ) {
      return this.invalidateAction(a, this.getCard().getPosition(), "You can't cast that!");
    }
  }
}
ModifierEnemyCannotCastBBS.prototype.type = 'ModifierEnemyCannotCastBBS';
ModifierEnemyCannotCastBBS.prototype.manaCostPrevented = 0;
ModifierEnemyCannotCastBBS.prototype.fxResource = ['FX.Modifiers.ModifierCannotCastSpellsByCost'];

module.exports = ModifierEnemyCannotCastBBS;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
