/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifier = require('./playerModifier');
const ModifierAlwaysBackstabbed = require('app/sdk/modifiers/modifierAlwaysBackstabbed');
const CONFIG = require('app/common/config');

class PlayerModifierTeamAlwaysBackstabbed extends PlayerModifier {
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

  static type = 'PlayerModifierTeamAlwaysBackstabbed';
  static isHiddenToUI = true;

  static createContextObject(auraModifierAppliedName, auraModifierAppliedDescription, options) {
    const contextObject = super.createContextObject(options);
    const auraModifier = ModifierAlwaysBackstabbed.createContextObject();
    auraModifier.appliedName = auraModifierAppliedName;
    auraModifier.appliedDescription = auraModifierAppliedDescription;
    contextObject.modifiersContextObjects = [auraModifier];
    return contextObject;
  }
}
PlayerModifierTeamAlwaysBackstabbed.prototype.type = 'PlayerModifierTeamAlwaysBackstabbed';
PlayerModifierTeamAlwaysBackstabbed.prototype.maxStacks = 1;
PlayerModifierTeamAlwaysBackstabbed.prototype.isAura = true;
PlayerModifierTeamAlwaysBackstabbed.prototype.auraIncludeAlly = true;
PlayerModifierTeamAlwaysBackstabbed.prototype.auraIncludeBoard = true;
PlayerModifierTeamAlwaysBackstabbed.prototype.auraIncludeEnemy = false;
PlayerModifierTeamAlwaysBackstabbed.prototype.auraIncludeGeneral = true;
PlayerModifierTeamAlwaysBackstabbed.prototype.auraIncludeHand = false;
PlayerModifierTeamAlwaysBackstabbed.prototype.auraIncludeSelf = true;
PlayerModifierTeamAlwaysBackstabbed.prototype.auraRadius = CONFIG.WHOLE_BOARD_RADIUS;
PlayerModifierTeamAlwaysBackstabbed.prototype.modifiersContextObjects = null;

module.exports = PlayerModifierTeamAlwaysBackstabbed;
