/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const DamageAction = require('app/sdk/actions/damageAction');
const ApplyCardToBoardAction = require('app/sdk/actions/applyCardToBoardAction');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const UtilsPosition = require('app/common/utils/utils_position');
const CardType = require('app/sdk/cards/cardType');

const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierAntiMagicField extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare maxStacks: any;
  declare fxResource: any;
  declare static keywordDefinition: any;
  declare static modifierName: any;

  static type = 'ModifierAntiMagicField';
  static isKeyworded = true;
  static description = null;

  onValidateAction(event) {
    const a = event.action;

    // cannot be targeted by spells
    if ((this.getCard() != null) && a instanceof ApplyCardToBoardAction && a.getIsValid() && UtilsPosition.getPositionsAreEqual(this.getCard().getPosition(), a.getTargetPosition())) {
      const card = a.getCard();
      if ((card.getRootPlayedCard().type === CardType.Spell) && !card.getTargetsSpace() && !card.getAppliesSameEffectToMultipleTargets()) {
        return this.invalidateAction(a, this.getCard().getPosition(), 'Protected by Anti-Magic Field.');
      }
    }
  }

  onModifyActionForExecution(event) {
    const a = event.action;

    // cannot be damaged by spells
    if (a instanceof DamageAction) {
      const rootAction = a.getRootAction();
      if (rootAction instanceof ApplyCardToBoardAction && (rootAction.getCard().getRootPlayedCard().type === CardType.Spell) && this.getCard() && (a.getTarget() === this.getCard())) {
        a.setChangedByModifier(this);
        return a.setDamageMultiplier(0);
      }
    }
  }
}
ModifierAntiMagicField.prototype.type = 'ModifierAntiMagicField';
ModifierAntiMagicField.keywordDefinition = i18next.t('modifiers.antimagic_field_def');
ModifierAntiMagicField.modifierName = i18next.t('modifiers.antimagic_field_name');
ModifierAntiMagicField.prototype.activeInHand = false;
ModifierAntiMagicField.prototype.activeInDeck = false;
ModifierAntiMagicField.prototype.activeInSignatureCards = false;
ModifierAntiMagicField.prototype.activeOnBoard = true;
ModifierAntiMagicField.prototype.maxStacks = 1;
ModifierAntiMagicField.prototype.fxResource = ['FX.Modifiers.ModifierAntiMagicField'];

module.exports = ModifierAntiMagicField;
