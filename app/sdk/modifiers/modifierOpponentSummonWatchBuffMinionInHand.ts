/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const Modifier = require('./modifier');
const ModifierOpponentSummonWatch = require('./modifierOpponentSummonWatch');

class ModifierOpponentSummonWatchDamageBuffMinionInHand extends ModifierOpponentSummonWatch {
  declare type: any;
  declare fxResource: any;
  declare statsBuff: any;

  static type = 'ModifierOpponentSummonWatchDamageBuffMinionInHand';
  static modifierName = 'Opponent Summon Watch Buff Minion in Hand';
  static description = 'Whenever your opponent summons a minion, buff a minion in hand';

  static createContextObject(attackBuff, maxHPBuff, buffName, options) {
    if (attackBuff == null) { attackBuff = 0; }
    if (maxHPBuff == null) { maxHPBuff = 0; }
    const contextObject = super.createContextObject(options);
    contextObject.statsBuff = Modifier.createContextObjectWithAttributeBuffs(attackBuff, maxHPBuff, { modifierName: buffName });
    return contextObject;
  }

  onSummonWatch(action) {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const deck = this.getOwner().getDeck();
      const cards = deck.getCardsInHand();
      let possibleCards = [];
      for (var card of Array.from<any>(cards)) {
        if ((card != null) && (card.getType() === CardType.Unit)) {
          possibleCards = possibleCards.concat(card);
        }
      }

      if (possibleCards.length > 0) {
        const cardToBuff = possibleCards[this.getGameSession().getRandomIntegerForExecution(possibleCards.length)];
        return this.getGameSession().applyModifierContextObject(this.statsBuff, cardToBuff);
      }
    }
  }
}
ModifierOpponentSummonWatchDamageBuffMinionInHand.prototype.type = 'ModifierOpponentSummonWatchDamageBuffMinionInHand';
ModifierOpponentSummonWatchDamageBuffMinionInHand.prototype.fxResource = ['FX.Modifiers.ModifierOpponentSummonWatch'];
ModifierOpponentSummonWatchDamageBuffMinionInHand.prototype.statsBuff = null;

module.exports = ModifierOpponentSummonWatchDamageBuffMinionInHand;
