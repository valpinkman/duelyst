/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierBlastAttack = require('./modifierBlastAttack');

class ModifierBlastAttackStrong extends ModifierBlastAttack {
  declare type: any;
  declare cardFXResource: any;

  static type = 'ModifierBlastAttackStrong';
}
ModifierBlastAttackStrong.prototype.type = 'ModifierBlastAttackStrong';
ModifierBlastAttackStrong.prototype.cardFXResource = ['FX.Cards.Faction3.BlastStrong'];

module.exports = ModifierBlastAttackStrong;
