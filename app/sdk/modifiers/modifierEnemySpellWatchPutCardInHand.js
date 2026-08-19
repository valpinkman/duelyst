/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const ModifierEnemySpellWatch = require('./modifierEnemySpellWatch');

class ModifierEnemySpellWatchPutCardInHand extends ModifierEnemySpellWatch {
  static type = 'ModifierEnemySpellWatchPutCardInHand';
  static modifierName = 'Enemy Spell Watch Put Card In Hand';
  static description = 'Whenever the opponent casts a spell, put an X in your action bar';

  static createContextObject(cardDataOrIndexToPutInHand, options) {
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToPutInHand = cardDataOrIndexToPutInHand;
    return contextObject;
  }

  onEnemySpellWatch(action) {
    const a = new PutCardInHandAction(this.getGameSession(), this.getCard().getOwnerId(), this.cardDataOrIndexToPutInHand);
    return this.getGameSession().executeAction(a);
  }
}
ModifierEnemySpellWatchPutCardInHand.prototype.type = 'ModifierEnemySpellWatchPutCardInHand';
ModifierEnemySpellWatchPutCardInHand.prototype.fxResource = ['FX.Modifiers.ModifierSpellWatch'];

module.exports = ModifierEnemySpellWatchPutCardInHand;
