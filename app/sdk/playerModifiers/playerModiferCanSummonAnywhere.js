/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const PlayerModifier = require('app/sdk/playerModifiers/playerModifier');
const ModifierAirdrop = require('app/sdk/modifiers/modifierAirdrop');

class PlayerModiferCanSummonAnywhere extends PlayerModifier {
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
PlayerModiferCanSummonAnywhere.prototype.modifiersContextObjects = [ModifierAirdrop.createContextObject()];

module.exports = PlayerModiferCanSummonAnywhere;
