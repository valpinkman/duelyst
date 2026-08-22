/*
 * decaffeinate suggestions:
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Modifier = require('./modifier');
const ModifierSummonWatchByCardBuffTarget = require('./modifierSummonWatchByCardBuffTarget');

class ModifierSummonWatchDreadnaught extends ModifierSummonWatchByCardBuffTarget {
  declare type: any;
  declare fxResource: any;
  declare validCardIds: any;

  static type = 'ModifierSummonWatchDreadnaught';
  static description = '%X you summon %Y';

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      const replaceText = this.description.replace(/%X/, modifierContextObject.cardDescription);
      return replaceText.replace(/%Y/, modifierContextObject.buffDescription);
    }
    return this.description;
  }

  getIsCardRelevantToWatcher(card) {
    return (
      __guard__(card.getAppliedToBoardByAction(), (x) => x.getSource()) !== this.getCard() &&
      super.getIsCardRelevantToWatcher(card)
    );
  }
}
ModifierSummonWatchDreadnaught.prototype.type = 'ModifierSummonWatchDreadnaught';
ModifierSummonWatchDreadnaught.prototype.fxResource = [
  'FX.Modifiers.ModifierSummonWatch',
  'FX.Modifiers.ModifierGenericBuff',
];
ModifierSummonWatchDreadnaught.prototype.validCardIds = null;

module.exports = ModifierSummonWatchDreadnaught;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
