/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DrawCardAction = require('app/sdk/actions/drawCardAction');
const CardType = require('app/sdk/cards/cardType');
const CONFIG = require('app/common/config');
const Modifier = require('./modifier');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitDrawCardBothPlayers extends ModifierOpeningGambit {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitDrawCardBothPlayers';
  static modifierName = 'Opening Gambit';
  static description = 'Both players draw a card';

  static createContextObject(damageAmount, options) {
    const contextObject = super.createContextObject();
    contextObject.damageAmount = damageAmount;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/, modifierContextObject.damageAmount);
    }
    return this.description;
  }

  onOpeningGambit() {
    const general = this.getCard()
      .getGameSession()
      .getGeneralForPlayerId(this.getCard().getOwnerId());
    this.getGameSession().executeAction(
      new DrawCardAction(this.getGameSession(), general.getOwnerId()),
    );

    const enemyGeneral = this.getCard()
      .getGameSession()
      .getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId());
    return this.getGameSession().executeAction(
      new DrawCardAction(this.getGameSession(), enemyGeneral.getOwnerId()),
    );
  }
}
ModifierOpeningGambitDrawCardBothPlayers.prototype.type =
  'ModifierOpeningGambitDrawCardBothPlayers';
ModifierOpeningGambitDrawCardBothPlayers.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
];

module.exports = ModifierOpeningGambitDrawCardBothPlayers;
