/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const ModifierTakeDamageWatch = require('./modifierTakeDamageWatch');
const ModifierSilence = require('./modifierSilence');

class ModifierTakeDamageWatchDispel extends ModifierTakeDamageWatch {
  static type = 'ModifierTakeDamageWatchDispel';
  static modifierName = 'Take Damage Watch';
  static description = 'Dispel any minion that deals damage to this one';

  onDamageTaken(action) {
    super.onDamageTaken(action);

    // go back to closest source card that is a unit
    const sourceCard = __guard__(action.getSource(), (x) => x.getAncestorCardOfType(CardType.Unit));

    // dispel any minion that damages this one
    if ((sourceCard != null) && !sourceCard.getIsGeneral()) {
      return this.getGameSession().applyModifierContextObject(ModifierSilence.createContextObject(), sourceCard);
    }
  }
}
ModifierTakeDamageWatchDispel.prototype.type = 'ModifierTakeDamageWatchDispel';
ModifierTakeDamageWatchDispel.prototype.fxResource = ['FX.Modifiers.ModifierTakeDamageWatch'];

module.exports = ModifierTakeDamageWatchDispel;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
