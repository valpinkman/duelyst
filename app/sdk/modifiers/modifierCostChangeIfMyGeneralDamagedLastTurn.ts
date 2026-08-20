/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const ModifierManaCostChange = require('./modifierManaCostChange');
const ModifierMyGeneralDamagedWatch = require('./modifierMyGeneralDamagedWatch');

class ModifierCostChangeIfMyGeneralDamagedLastTurn extends ModifierMyGeneralDamagedWatch {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeOnBoard: any;
  declare static description: any;

  static type = 'ModifierCostChangeIfMyGeneralDamagedLastTurn';
  static modifierName = 'My General Damaged Watch';

  static createContextObject(costChange, description, options) {
    if (costChange == null) {
      costChange = 0;
    }
    if (description == null) {
      description = '';
    }
    const contextObject = super.createContextObject(options);
    const costChangeContextObject = ModifierManaCostChange.createContextObject(costChange);
    costChangeContextObject.appliedName = i18next.t(
      'modifiers.cost_change_if_my_general_damaged_last_turn_name_name',
    );
    costChangeContextObject.durationEndTurn = 2;
    contextObject.modifiersContextObjects = [costChangeContextObject];
    contextObject.description = description;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return i18next.t('modifiers.cost_change_if_my_general_damaged_last_turn_name_def', {
        desc: this.description,
      });
      // return @description.replace /%X/, modifierContextObject.description
    }
    return this.description;
  }

  onDamageDealtToGeneral(action) {
    if (!this.getSubModifiers() || __guard__(this.getSubModifiers(), (x) => x.length) === 0) {
      // if no sub modifiers currently attached to this card
      // and if damage was dealt to my General on opponent's turn
      if (
        this.getGameSession().getCurrentPlayer().getPlayerId() ===
        this.getGameSession().getOpponentPlayerIdOfPlayerId(this.getCard().getOwnerId())
      ) {
        // apply mana modifier
        return this.applyManagedModifiersFromModifiersContextObjects(
          this.modifiersContextObjects,
          this.getCard(),
        );
      }
    }
  }
}
ModifierCostChangeIfMyGeneralDamagedLastTurn.prototype.type =
  'ModifierCostChangeIfMyGeneralDamagedLastTurn';
ModifierCostChangeIfMyGeneralDamagedLastTurn.description = i18next.t(
  'modifiers.cost_change_if_my_general_damaged_last_turn_name_def',
);
ModifierCostChangeIfMyGeneralDamagedLastTurn.prototype.activeInHand = true;
ModifierCostChangeIfMyGeneralDamagedLastTurn.prototype.activeInDeck = true;
ModifierCostChangeIfMyGeneralDamagedLastTurn.prototype.activeOnBoard = false;

module.exports = ModifierCostChangeIfMyGeneralDamagedLastTurn;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
