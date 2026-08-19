/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const DrawCardAction = require('app/sdk/actions/drawCardAction');
const ModifierTakeDamageWatch = require('./modifierTakeDamageWatch');

class ModifierTakeDamageWatchOpponentDrawCard extends ModifierTakeDamageWatch {
  static type = 'ModifierTakeDamageWatchOpponentDrawCard';

  static createContextObject(options) {
    const contextObject = super.createContextObject(options);

    return contextObject;
  }

  onDamageTaken(action) {
    super.onDamageTaken(action);

    const enemyGeneral = this.getCard().getGameSession().getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId());
    return this.getGameSession().executeAction(new DrawCardAction(this.getGameSession(), enemyGeneral.getOwnerId()));
  }
}
ModifierTakeDamageWatchOpponentDrawCard.prototype.type = 'ModifierTakeDamageWatchOpponentDrawCard';

module.exports = ModifierTakeDamageWatchOpponentDrawCard;
