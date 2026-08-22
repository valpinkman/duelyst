/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const PlayerModifier = require('@duelyst/sdk/playerModifiers/playerModifier');
const ModifierAirdrop = require('@duelyst/sdk/modifiers/modifierAirdrop');

class PlayerModiferCanSummonAnywhere extends PlayerModifier {
  declare type: any;
  declare isAura: any;
  declare auraIncludeAlly: any;
  declare auraIncludeBoard: any;
  declare auraIncludeEnemy: any;
  declare auraIncludeGeneral: any;
  declare auraIncludeHand: any;
  declare auraIncludeSelf: any;
  declare modifiersContextObjects: any;

  static type = 'PlayerModiferCanSummonAnywhere';
}
PlayerModiferCanSummonAnywhere.prototype.type = 'PlayerModiferCanSummonAnywhere';
PlayerModiferCanSummonAnywhere.prototype.isAura = true;
PlayerModiferCanSummonAnywhere.prototype.auraIncludeAlly = true;
PlayerModiferCanSummonAnywhere.prototype.auraIncludeBoard = false;
PlayerModiferCanSummonAnywhere.prototype.auraIncludeEnemy = false;
PlayerModiferCanSummonAnywhere.prototype.auraIncludeGeneral = false;
PlayerModiferCanSummonAnywhere.prototype.auraIncludeHand = true;
PlayerModiferCanSummonAnywhere.prototype.auraIncludeSelf = false;
PlayerModiferCanSummonAnywhere.prototype.modifiersContextObjects = [
  ModifierAirdrop.createContextObject(),
];

module.exports = PlayerModiferCanSummonAnywhere;
