/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const DrawCardAction = require('@duelyst/sdk/actions/drawCardAction');
const ModifierMyAttackOrAttackedWatch = require('./modifierMyAttackOrAttackedWatch');

class ModifierMyAttackOrAttackedWatchDrawCard extends ModifierMyAttackOrAttackedWatch {
  declare type: any;

  static type = 'ModifierMyAttackOrAttackedWatchDrawCard';
  static modifierName = 'Attack or Attacked Watch and Draw Card';
  static description = 'Whenever this minion attacks or is attacked, draw a card';

  onMyAttackOrAttackedWatch(action) {
    const a = new DrawCardAction(this.getGameSession(), this.getCard().getOwnerId());
    return this.getGameSession().executeAction(a);
  }
}
ModifierMyAttackOrAttackedWatchDrawCard.prototype.type = 'ModifierMyAttackOrAttackedWatchDrawCard';

module.exports = ModifierMyAttackOrAttackedWatchDrawCard;
