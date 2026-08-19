/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifier = require('app/sdk/playerModifiers/playerModifier');

class PlayerModifierCannotReplace extends PlayerModifier {
  static type = 'PlayerModifierCannotReplace';
}
PlayerModifierCannotReplace.prototype.type = 'PlayerModifierCannotReplace';

module.exports = PlayerModifierCannotReplace;
