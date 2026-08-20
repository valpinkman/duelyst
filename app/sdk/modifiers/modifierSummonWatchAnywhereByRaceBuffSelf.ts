/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierSummonWatchByRaceBuffSelf = require('./modifierSummonWatchByRaceBuffSelf');

class ModifierSummonWatchAnywhereByRaceBuffSelf extends ModifierSummonWatchByRaceBuffSelf {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierSummonWatchAnywhereByRaceBuffSelf';

  onActivate() {
    // special check on activation in case this card is created mid-game
    // need to check all actions that occured this gamesession for triggers
    const summonMinionActions = this.getGameSession().filterActions(
      this.getIsActionRelevant.bind(this),
    );
    return (() => {
      const result = [];
      for (var action of Array.from<any>(summonMinionActions)) {
        if (
          this.getIsCardRelevantToWatcher(action.getCard()) &&
          action.getCard() !== this.getCard()
        ) {
          result.push(this.onSummonWatch(action));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
}
ModifierSummonWatchAnywhereByRaceBuffSelf.prototype.type =
  'ModifierSummonWatchAnywhereByRaceBuffSelf';
ModifierSummonWatchAnywhereByRaceBuffSelf.prototype.activeInHand = true;
ModifierSummonWatchAnywhereByRaceBuffSelf.prototype.activeInDeck = true;
ModifierSummonWatchAnywhereByRaceBuffSelf.prototype.activeInSignatureCards = false;
ModifierSummonWatchAnywhereByRaceBuffSelf.prototype.activeOnBoard = true;
ModifierSummonWatchAnywhereByRaceBuffSelf.prototype.fxResource = [
  'FX.Modifiers.ModifierSummonWatch',
  'FX.Modifiers.ModifierGenericBuff',
];

module.exports = ModifierSummonWatchAnywhereByRaceBuffSelf;
