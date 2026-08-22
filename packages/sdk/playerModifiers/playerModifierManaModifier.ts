/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierManaCostChange = require('@duelyst/sdk/modifiers/modifierManaCostChange');
const PlayerModifier = require('./playerModifier');
const CardType = require('@duelyst/sdk/cards/cardType');

class PlayerModifierManaModifier extends PlayerModifier {
  declare type: any;
  declare bonusMana: any;
  declare costChange: any;
  declare isAura: any;
  declare auraIncludeAlly: any;
  declare auraIncludeBoard: any;
  declare auraIncludeEnemy: any;
  declare auraIncludeGeneral: any;
  declare auraIncludeHand: any;
  declare auraIncludeSelf: any;
  declare auraIncludeSignatureCards: any;

  static type = 'PlayerModifierManaModifier';

  static createContextObject(
    bonusMana,
    costChange,
    auraFilterByCardType,
    auraFilterByRaceIds,
    options,
  ) {
    if (bonusMana == null) {
      bonusMana = 0;
    }
    if (costChange == null) {
      costChange = 0;
    }
    const contextObject = super.createContextObject(options);
    contextObject.bonusMana = bonusMana;
    contextObject.costChange = costChange;
    if (costChange !== 0) {
      // modifies mana cost of cards
      contextObject.isAura = true;
      contextObject.auraFilterByCardType = auraFilterByCardType;
      contextObject.auraFilterByRaceIds = auraFilterByRaceIds;
      contextObject.modifiersContextObjects = [
        ModifierManaCostChange.createContextObject(costChange),
      ];
    }
    return contextObject;
  }

  static createCostChangeContextObject(
    costChange,
    auraFilterByCardType,
    auraFilterByRaceIds,
    options,
  ) {
    return this.createContextObject(
      0,
      costChange,
      auraFilterByCardType,
      auraFilterByRaceIds,
      options,
    );
  }

  static createBonusManaContextObject(bonusMana, options) {
    return this.createContextObject(bonusMana, null, null, null, options);
  }

  _filterPotentialCardInAura(card) {
    let beingUsedForBonusMana = false;
    if (this.costChange === 0 && !this.isAura) {
      beingUsedForBonusMana = true;
    }
    return beingUsedForBonusMana || super._filterPotentialCardInAura(card);
  }
}
PlayerModifierManaModifier.prototype.type = 'PlayerModifierManaModifier';
PlayerModifierManaModifier.prototype.bonusMana = 0;
PlayerModifierManaModifier.prototype.costChange = 0;
PlayerModifierManaModifier.prototype.isAura = false;
PlayerModifierManaModifier.prototype.auraIncludeAlly = true;
PlayerModifierManaModifier.prototype.auraIncludeBoard = false;
PlayerModifierManaModifier.prototype.auraIncludeEnemy = false;
PlayerModifierManaModifier.prototype.auraIncludeGeneral = false;
PlayerModifierManaModifier.prototype.auraIncludeHand = true;
PlayerModifierManaModifier.prototype.auraIncludeSelf = false;
PlayerModifierManaModifier.prototype.auraIncludeSignatureCards = false;

module.exports = PlayerModifierManaModifier;
