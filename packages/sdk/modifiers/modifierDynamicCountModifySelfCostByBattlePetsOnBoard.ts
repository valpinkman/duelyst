/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Races = require('@duelyst/sdk/cards/racesLookup');
const CardType = require('@duelyst/sdk/cards/cardType');
const ModifierDynamicCountModifySelf = require('./modifierDynamicCountModifySelf');
const ModifierManaCostChange = require('./modifierManaCostChange');

class ModifierDynamicCountModifySelfCostByBattlePetsOnBoard extends ModifierDynamicCountModifySelf {
  declare type: any;
  declare activeInDeck: any;
  declare activeInHand: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;

  static type = 'ModifierDynamicCountModifySelfCostByBattlePetsOnBoard';
  static description = 'Costs %X for each friendly Battle Pet on the field';

  static createContextObject(manaCostChange, description, appliedName, options) {
    if (manaCostChange == null) {
      manaCostChange = 0;
    }
    if (options == null) {
      options = undefined;
    }
    const contextObject = super.createContextObject(options);
    const perPetCostChangeBuff = ModifierManaCostChange.createContextObject(manaCostChange);
    if (appliedName) {
      perPetCostChangeBuff.appliedName = appliedName;
    }
    contextObject.description = description;
    contextObject.modifiersContextObjects = [perPetCostChangeBuff];
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    return this.description.replace(/%X/, modifierContextObject.description);
  }

  getCurrentCount() {
    let battlePetCount = 0;
    for (var card of Array.from<any>(this.getGameSession().getBoard().getCards(CardType.Unit))) {
      if (
        card.getOwnerId() === this.getCard().getOwnerId() &&
        card.getBelongsToTribe(Races.BattlePet)
      ) {
        battlePetCount++;
      }
    }
    return battlePetCount;
  }
}
ModifierDynamicCountModifySelfCostByBattlePetsOnBoard.prototype.type =
  'ModifierDynamicCountModifySelfCostByBattlePetsOnBoard';
ModifierDynamicCountModifySelfCostByBattlePetsOnBoard.prototype.activeInDeck = false;
ModifierDynamicCountModifySelfCostByBattlePetsOnBoard.prototype.activeInHand = true;
ModifierDynamicCountModifySelfCostByBattlePetsOnBoard.prototype.activeInSignatureCards = false;
ModifierDynamicCountModifySelfCostByBattlePetsOnBoard.prototype.activeOnBoard = true;

module.exports = ModifierDynamicCountModifySelfCostByBattlePetsOnBoard;
