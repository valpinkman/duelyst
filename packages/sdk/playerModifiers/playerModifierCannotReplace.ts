/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifier = require('@duelyst/sdk/playerModifiers/playerModifier');

class PlayerModifierCannotReplace extends PlayerModifier {
  declare type: any;

  static type = 'PlayerModifierCannotReplace';
}
PlayerModifierCannotReplace.prototype.type = 'PlayerModifierCannotReplace';

module.exports = PlayerModifierCannotReplace;
