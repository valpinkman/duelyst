/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Modifier = require('app/sdk/modifiers/modifier');

class PlayerModifier extends Modifier {
  static type = 'PlayerModifier';
  static isHiddenToUI = true;
}
PlayerModifier.prototype.type = 'PlayerModifier';
PlayerModifier.prototype.isRemovable = false;
PlayerModifier.prototype.isCloneable = false;
PlayerModifier.prototype.getPlayer = PlayerModifier.prototype.getOwner;
PlayerModifier.prototype.getPlayerId = PlayerModifier.prototype.getOwnerId;

// endregion PLAYER

module.exports = PlayerModifier;
