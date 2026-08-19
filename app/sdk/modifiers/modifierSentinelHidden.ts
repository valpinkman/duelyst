/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierOverwatchHidden = require('./modifierOverwatchHidden');

/*
  Generic modifier used to hide the true sentinel modifier from an opponent.
*/
class ModifierSentinelHidden extends ModifierOverwatchHidden {
  declare type: any;

  static type = 'ModifierSentinelHidden';
  static isKeyworded = true;
  static keywordDefinition = 'Hidden condition is one of: the opponent summons a minion, casts a spell, or attacks with General.';
  static modifierName = 'Sentinel';
  static description = '%X';
}
ModifierSentinelHidden.prototype.type = 'ModifierSentinelHidden';

module.exports = ModifierSentinelHidden;
