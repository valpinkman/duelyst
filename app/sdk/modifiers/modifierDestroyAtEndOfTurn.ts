/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const KillAction = require('app/sdk/actions/killAction');
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierDestroyAtEndOfTurn extends Modifier {
  declare type: any;
  declare maxStacks: any;
  declare durationEndTurn: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;
  declare static description: any;

  static type = 'ModifierDestroyAtEndOfTurn';
  static modifierName = '';

  static createContextObject(options) {
    const contextObject = super.createContextObject(options);
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    return this.description;
  }

  onExpire() {
    super.onExpire();

    const killAction = new KillAction(this.getGameSession());
    killAction.setOwnerId(this.getCard().getOwnerId());
    killAction.setSource(this.getCard());
    killAction.setTarget(this.getCard());
    return this.getGameSession().executeAction(killAction);
  }
}
ModifierDestroyAtEndOfTurn.prototype.type = 'ModifierDestroyAtEndOfTurn';
ModifierDestroyAtEndOfTurn.prototype.maxStacks = 1;
ModifierDestroyAtEndOfTurn.prototype.durationEndTurn = 1;
ModifierDestroyAtEndOfTurn.description = i18next.t('modifiers.destroy_at_end_of_turn_def');
ModifierDestroyAtEndOfTurn.prototype.activeInHand = false;
ModifierDestroyAtEndOfTurn.prototype.activeInDeck = false;
ModifierDestroyAtEndOfTurn.prototype.activeInSignatureCards = false;
ModifierDestroyAtEndOfTurn.prototype.activeOnBoard = true;
ModifierDestroyAtEndOfTurn.prototype.fxResource = ['FX.Modifiers.ModifierDestroyAtEndOfTurn'];

module.exports = ModifierDestroyAtEndOfTurn;
