/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DieAction = require('app/sdk/actions/dieAction');
const CardType = require('app/sdk/cards/cardType');
const Stringifiers = require('app/sdk/helpers/stringifiers');
const Modifier = require('./modifier');

class ModifierStartTurnWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierStartTurnWatch';
  static modifierName = 'Start Turn Watch';
  static description = 'Start Turn Watch';

  onStartTurn(e) {
    super.onStartTurn(e);

    if (this.getCard().isOwnersTurn()) {
      const action = this.getGameSession().getExecutingAction();
      return this.onTurnWatch(action);
    }
  }

  onTurnWatch(action) {}
}
ModifierStartTurnWatch.prototype.type = 'ModifierStartTurnWatch';
ModifierStartTurnWatch.prototype.activeInHand = false;
ModifierStartTurnWatch.prototype.activeInDeck = false;
ModifierStartTurnWatch.prototype.activeInSignatureCards = false;
ModifierStartTurnWatch.prototype.activeOnBoard = true;
ModifierStartTurnWatch.prototype.fxResource = ['FX.Modifiers.ModifierStartTurnWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierStartTurnWatch;
