/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const DrawCardAction = require('app/sdk/actions/drawCardAction');
const ModifierDealDamageWatch = require('./modifierDealDamageWatch');

class ModifierDealDamageWatchDrawCard extends ModifierDealDamageWatch {
  declare type: any;

  static type = 'ModifierDealDamageWatchDrawCard';
  static modifierName = 'Deal Damage and draw card';
  static description = 'Whenever this minion deals damage, draw a card';

  onDealDamage(action) {
    const a = new DrawCardAction(this.getGameSession(), this.getCard().getOwnerId());
    return this.getGameSession().executeAction(a);
  }
}
ModifierDealDamageWatchDrawCard.prototype.type = 'ModifierDealDamageWatchDrawCard';

module.exports = ModifierDealDamageWatchDrawCard;
