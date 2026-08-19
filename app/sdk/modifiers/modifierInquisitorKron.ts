/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Cards = require('app/sdk/cards/cardsLookupComplete');
const ModifierReplaceWatchSpawnEntity = require('./modifierReplaceWatchSpawnEntity');

class ModifierInquisitorKron extends ModifierReplaceWatchSpawnEntity {
  declare type: any;
  declare prisonerList: any;

  static type = 'ModifierInquisitorKron';

  onReplaceWatch(action) {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      this.cardDataOrIndexToSpawn = this.prisonerList[this.getGameSession().getRandomIntegerForExecution(this.prisonerList.length)];
      return super.onReplaceWatch(action);
    }
  }
}
ModifierInquisitorKron.prototype.type = 'ModifierInquisitorKron';
ModifierInquisitorKron.prototype.prisonerList = [{ id: Cards.Neutral.Prisoner1 }, { id: Cards.Neutral.Prisoner2 }, { id: Cards.Neutral.Prisoner3 }, { id: Cards.Neutral.Prisoner5 }, { id: Cards.Neutral.Prisoner6 }];

module.exports = ModifierInquisitorKron;
