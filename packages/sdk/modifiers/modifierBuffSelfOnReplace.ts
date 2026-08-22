/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ReplaceCardFromHandAction = require('@duelyst/sdk/actions/replaceCardFromHandAction');
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierBuffSelfOnReplace extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;
  declare static description: any;

  static type = 'ModifierBuffSelfOnReplace';
  static modifierName = 'Buff Self On Replace';

  static createContextObject(attackBuff, maxHPBuff, costChange, description, options) {
    if (attackBuff == null) {
      attackBuff = 0;
    }
    if (maxHPBuff == null) {
      maxHPBuff = 0;
    }
    if (costChange == null) {
      costChange = 0;
    }
    if (options == null) {
      options = undefined;
    }
    const contextObject = super.createContextObject(options);
    const statsBuff = Modifier.createContextObjectWithAttributeBuffs(attackBuff, maxHPBuff);
    statsBuff.appliedName = i18next.t('modifiers.buff_self_on_replace_name');
    statsBuff.attributeBuffs.manaCost = costChange;
    contextObject.modifiersContextObjects = [statsBuff];
    contextObject.description = description;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return i18next.t('modifiers.buff_self_on_replace_def', { desc: this.description });
      // return @description.replace /%X/, modifierContextObject.description
    }
    return this.description;
  }

  onAction(e) {
    super.onAction(e);

    const { action } = e;

    // watch for my player replacing THIS card
    if (
      action instanceof ReplaceCardFromHandAction &&
      action.getOwnerId() === this.getCard().getOwnerId()
    ) {
      const replacedCard = this.getGameSession().getExistingCardFromIndexOrCreateCardFromData(
        action.replacedCardIndex,
      );
      if (replacedCard === this.getCard()) {
        return this.applyManagedModifiersFromModifiersContextObjects(
          this.modifiersContextObjects,
          this.getCard(),
        );
      }
    }
  }
}
ModifierBuffSelfOnReplace.prototype.type = 'ModifierBuffSelfOnReplace';
ModifierBuffSelfOnReplace.description = i18next.t('modifiers.buff_self_on_replace_def');
ModifierBuffSelfOnReplace.prototype.activeInHand = true;
ModifierBuffSelfOnReplace.prototype.activeInDeck = true;
ModifierBuffSelfOnReplace.prototype.activeInSignatureCards = false;
ModifierBuffSelfOnReplace.prototype.activeOnBoard = false;
ModifierBuffSelfOnReplace.prototype.fxResource = ['FX.Modifiers.ModifierBuffSelfOnReplace'];

module.exports = ModifierBuffSelfOnReplace;
