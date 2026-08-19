/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const Modifier = require('./modifier');

/*
  Aidrop is a special modifier used primarily as a marker for logic in the Entity class (entity.coffee).
  In Entity.coffee the methods `getValidTargetPositions` and `getIsPositionValidTarget` will check for airdrop by modifier name
*/
class ModifierAirdrop extends Modifier {
  static type = 'ModifierAirdrop';
  static isKeyworded = true;
  static description = null;
}
ModifierAirdrop.prototype.type = 'ModifierAirdrop';
ModifierAirdrop.prototype.maxStacks = 1;
ModifierAirdrop.modifierName = i18next.t('modifiers.airdrop_name');
ModifierAirdrop.keywordDefinition = i18next.t('modifiers.airdrop_def');
ModifierAirdrop.prototype.fxResource = ['FX.Modifiers.ModifierAirdrop'];

module.exports = ModifierAirdrop;
