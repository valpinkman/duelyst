/*
 * decaffeinate suggestions:
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const EndTurnAction = require('app/sdk/actions/endTurnAction');
const CardType = require('app/sdk/cards/cardType');
const ModifierOverwatch = require('./modifierOverwatch');

class ModifierOverwatchEndTurn extends ModifierOverwatch {
  static initClass() {
    this.prototype.type = 'ModifierOverwatchEndTurn';
    this.type = 'ModifierOverwatchEndTurn';

    this.description = 'When opponent ends turn, %X';
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject != null) {
      return this.description.replace(/%X/, modifierContextObject.description);
    }
    return super.getDescription();
  }

  getIsActionRelevant(action) {
    if (action instanceof EndTurnAction) {
      return true;
    }
    return false;
  }
}
ModifierOverwatchEndTurn.initClass();

module.exports = ModifierOverwatchEndTurn;
