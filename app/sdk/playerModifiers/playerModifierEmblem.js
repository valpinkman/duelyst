/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifier = require('app/sdk/playerModifiers/playerModifier');

class PlayerModifierEmblem extends PlayerModifier {
  static type = 'PlayerModifierEmblem';
  static isHiddenToUI = false;
}
PlayerModifierEmblem.prototype.type = 'PlayerModifierEmblem';
PlayerModifierEmblem.prototype.fxResource = ['FX.Modifiers.ModifierEmblem'];

module.exports = PlayerModifierEmblem;
