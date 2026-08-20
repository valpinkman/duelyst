/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS204: Change includes calls to have a more natural evaluation order
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Modifier = require('./modifier');
const ModifierSummonWatch = require('./modifierSummonWatch');

class ModifierSummonWatchByCardBuffTarget extends ModifierSummonWatch {
  declare type: any;
  declare validCardIds: any;
  declare fxResource: any;

  static type = 'ModifierSummonWatchByCardBuffTarget';
  static modifierName = 'Summon Watch (buff by card Id)';
  static description = 'Whenever you summon %X, %Y';

  static createContextObject(
    modContextObject,
    validCardIds,
    cardDescription,
    buffDescription,
    options,
  ) {
    if (options == null) {
      options = undefined;
    }
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modContextObject;
    contextObject.validCardIds = validCardIds;
    contextObject.cardDescription = cardDescription;
    contextObject.buffDescription = buffDescription;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      const replaceText = this.description.replace(/%X/, modifierContextObject.cardDescription);
      return replaceText.replace(/%Y/, modifierContextObject.buffDescription);
    }
    return this.description;
  }

  onSummonWatch(action) {
    const entity = action.getCard();
    if (entity != null) {
      return Array.from<any>(this.modifiersContextObjects).map((modifierContextObject) =>
        this.getGameSession().applyModifierContextObject(modifierContextObject, entity),
      );
    }
  }

  getIsCardRelevantToWatcher(card) {
    let needle;
    return ((needle = card.getBaseCardId()), Array.from<any>(this.validCardIds).includes(needle));
  }
}
ModifierSummonWatchByCardBuffTarget.prototype.type = 'ModifierSummonWatchByCardBuffTarget';
ModifierSummonWatchByCardBuffTarget.prototype.validCardIds = null;
ModifierSummonWatchByCardBuffTarget.prototype.fxResource = [
  'FX.Modifiers.ModifierSummonWatch',
  'FX.Modifiers.ModifierGenericBuff',
];
// card is in list of cards we want to buff

module.exports = ModifierSummonWatchByCardBuffTarget;
