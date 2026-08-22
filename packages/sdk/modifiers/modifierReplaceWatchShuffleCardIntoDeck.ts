/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RandomDamageAction = require('@duelyst/sdk/actions/randomDamageAction');
const PutCardInDeckAction = require('@duelyst/sdk/actions/putCardInDeckAction');
const ModifierReplaceWatch = require('./modifierReplaceWatch');

class ModifierReplaceWatchShuffleCardIntoDeck extends ModifierReplaceWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierReplaceWatchShuffleCardIntoDeck';

  static createContextObject(cardDataOrIndexToSpawn, numOfCopies, options) {
    if (numOfCopies == null) {
      numOfCopies = 1;
    }
    if (options == null) {
      options = undefined;
    }
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToSpawn = cardDataOrIndexToSpawn;
    contextObject.numOfCopies = numOfCopies;
    return contextObject;
  }

  onReplaceWatch(action) {
    if (this.cardDataOrIndexToSpawn != null && this.numOfCopies > 0) {
      return (() => {
        const result = [];
        for (
          let i = 0, end = this.numOfCopies, asc = end >= 0;
          asc ? i < end : i > end;
          asc ? i++ : i--
        ) {
          var a = new PutCardInDeckAction(
            this.getGameSession(),
            this.getCard().getOwnerId(),
            this.cardDataOrIndexToSpawn,
          );
          result.push(this.getGameSession().executeAction(a));
        }
        return result;
      })();
    }
  }
}
ModifierReplaceWatchShuffleCardIntoDeck.prototype.type = 'ModifierReplaceWatchShuffleCardIntoDeck';
ModifierReplaceWatchShuffleCardIntoDeck.prototype.fxResource = [
  'FX.Modifiers.ModifierReplaceWatch',
  'FX.Modifiers.ModifierGenericBuff',
];

module.exports = ModifierReplaceWatchShuffleCardIntoDeck;
