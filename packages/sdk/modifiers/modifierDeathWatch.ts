/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DieAction = require('@duelyst/sdk/actions/dieAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const Stringifiers = require('@duelyst/sdk/helpers/stringifiers');

const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierDeathWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;
  declare static keywordDefinition: any;
  declare static modifierName: any;

  static type = 'ModifierDeathWatch';
  static isKeyworded = true;
  static description = 'Deathwatch';

  onAfterCleanupAction(e) {
    super.onAfterCleanupAction(e);

    const { action } = e;
    // watch for a unit dying
    if (this.getIsActionRelevant(action)) {
      return this.onDeathWatch(action);
    }
  }

  onDeathWatch(action) {}
  // override me in sub classes to implement special behavior

  getIsActionRelevant(action) {
    return (
      action instanceof DieAction &&
      action.getTarget() != null &&
      action.getTarget().getType() === CardType.Unit &&
      action.getTarget() !== this.getCard()
    );
  }
}
ModifierDeathWatch.prototype.type = 'ModifierDeathWatch';
ModifierDeathWatch.keywordDefinition = i18next.t('modifiers.deathwatch_def');
ModifierDeathWatch.modifierName = i18next.t('modifiers.deathwatch_name');
ModifierDeathWatch.prototype.activeInHand = false;
ModifierDeathWatch.prototype.activeInDeck = false;
ModifierDeathWatch.prototype.activeInSignatureCards = false;
ModifierDeathWatch.prototype.activeOnBoard = true;
ModifierDeathWatch.prototype.fxResource = ['FX.Modifiers.ModifierDeathwatch'];

module.exports = ModifierDeathWatch;
