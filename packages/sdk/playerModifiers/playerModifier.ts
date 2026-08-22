/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Modifier = require('@duelyst/sdk/modifiers/modifier');

class PlayerModifier extends Modifier {
  declare type: any;
  declare isRemovable: any;
  declare isCloneable: any;
  declare getPlayer: any;
  declare getPlayerId: any;

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
