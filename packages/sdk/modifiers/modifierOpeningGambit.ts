/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardAction = require('@duelyst/sdk/actions/playCardAction');
const ApplyModifierAction = require('@duelyst/sdk/actions/applyModifierAction');

const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierOpeningGambit extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare triggered: any;
  declare fxResource: any;
  declare static keywordDefinition: any;
  declare static modifierName: any;

  static type = 'ModifierOpeningGambit';
  static isKeyworded = true;
  static description = null;

  onActivate() {
    super.onActivate();

    if (!this.triggered && this.getCard().getIsPlayed()) {
      // always flag self as triggered when card becomes played
      this.triggered = true;
      let executingAction = this.getGameSession().getExecutingAction();

      // account for modifier activated by being applied
      if (executingAction != null && executingAction instanceof ApplyModifierAction) {
        const parentAction = executingAction.getParentAction();
        if (parentAction instanceof PlayCardAction) {
          executingAction = parentAction;
        }
      }

      if (
        executingAction == null ||
        (executingAction instanceof PlayCardAction && executingAction.getCard() === this.getCard())
      ) {
        // only trigger when played PlayCardAction or no action (i.e. during game setup)
        this.getGameSession().p_startBufferingEvents();
        return this.onOpeningGambit();
      }
    }
  }

  onOpeningGambit() {}
  // override me in sub classes to implement special behavior

  getIsActiveForCache() {
    return !this.triggered && super.getIsActiveForCache();
  }
}
ModifierOpeningGambit.prototype.type = 'ModifierOpeningGambit';
ModifierOpeningGambit.keywordDefinition = i18next.t('modifiers.opening_gambit_def');
ModifierOpeningGambit.modifierName = i18next.t('modifiers.opening_gambit_name');
ModifierOpeningGambit.prototype.activeInHand = false;
ModifierOpeningGambit.prototype.activeInDeck = false;
ModifierOpeningGambit.prototype.activeInSignatureCards = false;
ModifierOpeningGambit.prototype.activeOnBoard = true;
ModifierOpeningGambit.prototype.triggered = false;
ModifierOpeningGambit.prototype.fxResource = ['FX.Modifiers.ModifierOpeningGambit'];

module.exports = ModifierOpeningGambit;
