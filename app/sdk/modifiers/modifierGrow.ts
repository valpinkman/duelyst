/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const i18next = require('i18next');
const ModifierStartTurnWatchBuffSelf = require('./modifierStartTurnWatchBuffSelf');
const ModifierGrowOnBothTurns = require('./modifierGrowOnBothTurns');

class ModifierGrow extends ModifierStartTurnWatchBuffSelf {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;
  declare static keywordDefinition: any;
  declare static modifierName: any;

  static type = 'ModifierGrow';
  static isKeyworded = true;
  static description = '+%X/+%X';

  static createContextObject(growValue, options) {
    if (growValue == null) { growValue = 0; }
    if (options == null) { options = {}; }
    options.appliedName = 'Grow';
    const contextObject = super.createContextObject(growValue, growValue, options);
    contextObject.growValue = growValue;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject != null) {
      if (!modifierContextObject.isInherent) {
        return `Gains ${this.description.replace(/%X/g, modifierContextObject.growValue)} at start of your turn.`;
      }
      return this.description.replace(/%X/g, modifierContextObject.growValue);
    }
    return this.description;
  }

  onStartTurn(e) {
    // check if we need to grow on enemy's turn as well
    if (!this.getCard().isOwnersTurn()) {
      if (this.getCard().hasModifierType(ModifierGrowOnBothTurns.type)) {
        this.applyManagedModifiersFromModifiersContextObjects(this.modifiersContextObjects, this.getCard());
      }
    }
    return super.onStartTurn(e); // always grow on our own turn
  }

  activateGrow() {
    return this.applyManagedModifiersFromModifiersContextObjects(this.modifiersContextObjects, this.getCard());
  }

  getGrowBonus() {
    return this.growValue;
  }
}
ModifierGrow.prototype.type = 'ModifierGrow';
ModifierGrow.keywordDefinition = i18next.t('modifiers.grow_def');
ModifierGrow.modifierName = i18next.t('modifiers.grow_name');
ModifierGrow.prototype.activeInHand = false;
ModifierGrow.prototype.activeInDeck = false;
ModifierGrow.prototype.activeInSignatureCards = false;
ModifierGrow.prototype.activeOnBoard = true;
ModifierGrow.prototype.fxResource = ['FX.Modifiers.ModifierGenericBuff', 'FX.Modifiers.ModifierGrow'];

module.exports = ModifierGrow;
