/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RemoveAction = require('@duelyst/sdk/actions/removeAction');
const i18next = require('i18next');
const ModifierEndTurnWatch = require('./modifierEndTurnWatch');

class ModifierEphemeral extends ModifierEndTurnWatch {
  declare type: any;
  declare isRemovable: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare maxStacks: any;
  declare fxResource: any;
  declare static keywordDefinition: any;
  declare static modifierName: any;

  static type = 'ModifierEphemeral';
  static isKeyworded = true;
  static isHiddenToUI = true;
  static description = null;

  onEndTurn() {
    super.onEndTurn();

    // then remove entity from the board (just remove, don't die)
    const removeAction = this.getGameSession().createActionForType(RemoveAction.type);
    removeAction.setSource(this.getCard());
    removeAction.setTarget(this.getCard());
    return this.getGameSession().executeAction(removeAction);
  }
}
ModifierEphemeral.prototype.type = 'ModifierEphemeral';
ModifierEphemeral.keywordDefinition = i18next.t('modifiers.ephemeral_def');
ModifierEphemeral.modifierName = i18next.t('modifiers.ephemeral_name');
ModifierEphemeral.prototype.isRemovable = false;
ModifierEphemeral.prototype.activeInHand = false;
ModifierEphemeral.prototype.activeInDeck = false;
ModifierEphemeral.prototype.activeInSignatureCards = false;
ModifierEphemeral.prototype.activeOnBoard = true;
ModifierEphemeral.prototype.maxStacks = 1;
ModifierEphemeral.prototype.fxResource = ['FX.Modifiers.ModifierEphemeral'];

module.exports = ModifierEphemeral;
