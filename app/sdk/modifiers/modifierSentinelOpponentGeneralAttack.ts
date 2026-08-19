/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const AttackAction = require('app/sdk/actions/attackAction');

const i18next = require('i18next');
const ModifierSentinel = require('./modifierSentinel');

class ModifierSentinelOpponentGeneralAttack extends ModifierSentinel {
  declare type: any;
  declare static description: any;

  static type = 'ModifierSentinelOpponentGeneralAttack';

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
    if (this.getIsActionRelevant(action) && (action.getTarget() === this.getCard())) {
      return action.setTarget(newUnit);
    }
  }
}
ModifierSentinelOpponentGeneralAttack.prototype.type = 'ModifierSentinelOpponentGeneralAttack';
ModifierSentinelOpponentGeneralAttack.description = i18next.t('modifiers.sentinel_general_attack');

module.exports = ModifierSentinelOpponentGeneralAttack;
