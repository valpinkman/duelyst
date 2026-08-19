/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const ModifierDealDamageWatch = require('./modifierDealDamageWatch');

class ModifierDealDamageWatchRefreshSignatureCard extends ModifierDealDamageWatch {
  declare type: any;

  static type = 'ModifierDealDamageWatchRefreshSignatureCard';
  static modifierName = 'Deal Damage and refresh BBS';
  static description = 'When this minion deals damage, refresh your Bloodbound Spell';

  onDealDamage(action) {
    return this.getGameSession().executeAction(this.getOwner().actionActivateSignatureCard());
  }
}
ModifierDealDamageWatchRefreshSignatureCard.prototype.type = 'ModifierDealDamageWatchRefreshSignatureCard';

module.exports = ModifierDealDamageWatchRefreshSignatureCard;
