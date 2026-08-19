/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifier = require('./playerModifier');
const ModifierImmuneToSpellDamage = require('app/sdk/modifiers/modifierImmuneToSpellDamage');
const CONFIG = require('app/common/config');

class PlayerModifierPreventSpellDamage extends PlayerModifier {
  declare type: any;
  declare maxStacks: any;
  declare isAura: any;
  declare auraIncludeAlly: any;
  declare auraIncludeBoard: any;
  declare auraIncludeEnemy: any;
  declare auraIncludeGeneral: any;
  declare auraIncludeHand: any;
  declare auraIncludeSelf: any;
  declare auraRadius: any;
  declare modifiersContextObjects: any;

  static type = 'PlayerModifierPreventSpellDamage';
  static modifierName = 'Prevent Spell Damage';
  static description = 'Prevents ALL damage from spells';
}
PlayerModifierPreventSpellDamage.prototype.type = 'PlayerModifierPreventSpellDamage';
PlayerModifierPreventSpellDamage.prototype.maxStacks = 1;
PlayerModifierPreventSpellDamage.prototype.isAura = true;
PlayerModifierPreventSpellDamage.prototype.auraIncludeAlly = true;
PlayerModifierPreventSpellDamage.prototype.auraIncludeBoard = true;
PlayerModifierPreventSpellDamage.prototype.auraIncludeEnemy = true;
PlayerModifierPreventSpellDamage.prototype.auraIncludeGeneral = true;
PlayerModifierPreventSpellDamage.prototype.auraIncludeHand = false;
PlayerModifierPreventSpellDamage.prototype.auraIncludeSelf = true;
PlayerModifierPreventSpellDamage.prototype.auraRadius = CONFIG.WHOLE_BOARD_RADIUS;
PlayerModifierPreventSpellDamage.prototype.modifiersContextObjects = [ModifierImmuneToSpellDamage.createContextObject()];

module.exports = PlayerModifierPreventSpellDamage;
