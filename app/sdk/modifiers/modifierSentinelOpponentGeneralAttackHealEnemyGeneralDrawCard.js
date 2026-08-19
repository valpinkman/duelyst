/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const AttackAction = require('app/sdk/actions/attackAction');
const HealAction = require('app/sdk/actions/healAction');
const DrawCardAction = require('app/sdk/actions/drawCardAction');
const i18next = require('i18next');
const ModifierSentinel = require('./modifierSentinel');

class ModifierSentinelOpponentGeneralAttackHealEnemyGeneralDrawCard extends ModifierSentinel {
  static type = 'ModifierSentinelOpponentGeneralAttackHealEnemyGeneralDrawCard';

  static createContextObject(description, transformCardId, healAmount, options) {
    if (healAmount == null) { healAmount = 5; }
    const contextObject = super.createContextObject(description, transformCardId, options);
    contextObject.healAmount = healAmount;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject != null) {
      return this.description;
    }
    return super.getDescription();
  }

  getIsActionRelevant(action) {
    // watch for opponent General attacking
    if (action instanceof AttackAction && (action.getSource() === this.getGameSession().getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId()))) {
      return true;
    }
    return false;
  }

  onOverwatch(action) {
    const newUnit = super.onOverwatch(action);
    if (this.getIsActionRelevant(action)) {
      if (action.getTarget() === this.getCard()) {
        action.setTarget(newUnit);
      }

      const enemyGeneral = this.getCard().getGameSession().getGeneralForPlayerId(this.getGameSession().getOpponentPlayerIdOfPlayerId(this.getCard().getOwnerId()));

      const healAction2 = new HealAction(this.getGameSession());
      healAction2.setOwnerId(this.getCard().getOwnerId());
      healAction2.setTarget(enemyGeneral);
      healAction2.setHealAmount(this.healAmount);
      this.getGameSession().executeAction(healAction2);

      return this.getGameSession().executeAction(new DrawCardAction(this.getGameSession(), enemyGeneral.getOwnerId()));
    }
  }
}
ModifierSentinelOpponentGeneralAttackHealEnemyGeneralDrawCard.prototype.type = 'ModifierSentinelOpponentGeneralAttackHealEnemyGeneralDrawCard';
ModifierSentinelOpponentGeneralAttackHealEnemyGeneralDrawCard.description = i18next.t('modifiers.sentinel_general_attack');

module.exports = ModifierSentinelOpponentGeneralAttackHealEnemyGeneralDrawCard;
