/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifier = require('./playerModifier');

class PlayerModifierMechazorSummoned extends PlayerModifier {
  static type = 'PlayerModifierMechazorSummoned';
  static modifierName = 'MECHAZ0R Built';
  static description = 'MECHAZ0R';
}
PlayerModifierMechazorSummoned.prototype.type = 'PlayerModifierMechazorSummoned';
PlayerModifierMechazorSummoned.prototype.isRemovable = false;

module.exports = PlayerModifierMechazorSummoned;
