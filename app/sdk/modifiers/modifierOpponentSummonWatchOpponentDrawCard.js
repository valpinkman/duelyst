/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DrawCardAction = require('app/sdk/actions/drawCardAction');
const PlayCardFromHandAction = require('app/sdk/actions/playCardFromHandAction');
const ModifierOpponentSummonWatch = require('./modifierOpponentSummonWatch');

class ModifierOpponentSummonWatchOpponentDrawCard extends ModifierOpponentSummonWatch {
  static type = 'ModifierOpponentSummonWatchOpponentDrawCard';
  static modifierName = 'Opponent Summon Watch';
  static description = 'Whenever your opponent summons a minion, they draw a card';

  static createContextObject(options) {
    const contextObject = super.createContextObject(options);
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    return this.description;
  }

  onSummonWatch(action) {
    if (action instanceof PlayCardFromHandAction) {
      const enemyGeneral = this.getCard().getGameSession().getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId());
      return this.getGameSession().executeAction(new DrawCardAction(this.getGameSession(), enemyGeneral.getOwnerId()));
    }
  }
}
ModifierOpponentSummonWatchOpponentDrawCard.prototype.type = 'ModifierOpponentSummonWatchOpponentDrawCard';
ModifierOpponentSummonWatchOpponentDrawCard.prototype.damageAmount = 0;
ModifierOpponentSummonWatchOpponentDrawCard.prototype.fxResource = ['FX.Modifiers.ModifierOpponentSummonWatch', 'FX.Modifiers.ModifierGenericDamage'];

module.exports = ModifierOpponentSummonWatchOpponentDrawCard;
