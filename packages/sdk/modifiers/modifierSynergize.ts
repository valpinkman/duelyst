/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlaySignatureCardAction = require('@duelyst/sdk/actions/playSignatureCardAction');
const CardType = require('@duelyst/sdk/cards/cardType');

const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierSynergize extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;
  declare static keywordDefinition: any;
  declare static modifierName: any;

  static type = 'ModifierSynergize';
  static isKeyworded = true;
  static description = '';

  onAfterCleanupAction(e) {
    super.onAfterCleanupAction(e);

    const { action } = e;

    // watch for a spell being cast from Signature Card slot by player who owns this entity
    if (
      action instanceof PlaySignatureCardAction &&
      action.getOwnerId() === this.getCard().getOwnerId() &&
      __guard__(action.getCard(), (x) => x.type) === CardType.Spell
    ) {
      return this.onSynergize(action);
    }
  }

  onSynergize(action) {}
}
ModifierSynergize.prototype.type = 'ModifierSynergize';
ModifierSynergize.keywordDefinition = i18next.t('modifiers.blood_surge_def');
ModifierSynergize.modifierName = i18next.t('modifiers.blood_surge_name');
ModifierSynergize.prototype.activeInHand = false;
ModifierSynergize.prototype.activeInDeck = false;
ModifierSynergize.prototype.activeInSignatureCards = false;
ModifierSynergize.prototype.activeOnBoard = true;
ModifierSynergize.prototype.fxResource = ['FX.Modifiers.ModifierSynergize'];
// override me in sub classes to implement special behavior

module.exports = ModifierSynergize;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
