/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const Cards = require('@duelyst/sdk/cards/cardsLookupComplete');
const Rarity = require('@duelyst/sdk/cards/rarityLookup');
const ApplyCardToBoardAction = require('@duelyst/sdk/actions/applyCardToBoardAction');
const CloneEntityAction = require('@duelyst/sdk/actions/cloneEntityAction');
const SwapUnitAllegianceAction = require('@duelyst/sdk/actions/swapUnitAllegianceAction');
const RemoveAction = require('@duelyst/sdk/actions/removeAction');
const PlayerModifierEmblemSummonWatchVanarTokenQuest = require('@duelyst/sdk/playerModifiers/playerModifierEmblemSummonWatchVanarTokenQuest');
const i18next = require('i18next');
const ModifierQuestStatusVanar = require('./modifierQuestStatusVanar');

const ModifierFate = require('./modifierFate');

class ModifierFateVanarTokenQuest extends ModifierFate {
  declare type: any;
  declare numTokensRequired: any;
  declare numTokensFound: any;

  static type = 'ModifierFateVanarTokenQuest';

  static createContextObject(numTokensRequired, options) {
    const contextObject = super.createContextObject(options);
    contextObject.numTokensRequired = numTokensRequired;
    return contextObject;
  }

  onActivate() {
    const general = this.getCard()
      .getGameSession()
      .getGeneralForPlayerId(this.getCard().getOwnerId());
    this.numTokensFound = this.getTokenCount();
    if (
      (general != null &&
        general.hasActiveModifierClass(PlayerModifierEmblemSummonWatchVanarTokenQuest)) ||
      this.numTokensFound >= this.numTokensRequired
    ) {
      this._private.fateFulfilled = true;
      this.unlockFateCard();
      if (!general.hasActiveModifierClass(ModifierQuestStatusVanar)) {
        return this.applyQuestStatusModifier(true);
      }
    } else if (!general.hasActiveModifierClass(ModifierQuestStatusVanar)) {
      return this.applyQuestStatusModifier(false);
    }
  }

  updateFateCondition(action) {
    if (this.getIsActionRelevant(action)) {
      this.removeQuestStatusModifier();
      this.numTokensFound = this.getTokenCount();
      if (this.numTokensFound >= this.numTokensRequired) {
        this._private.fateFulfilled = true;
        super.updateFateCondition();
        const general = this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId());
        return this.applyQuestStatusModifier(true);
      }
      return this.applyQuestStatusModifier(false);
    }
  }

  getTokenCount(action?) {
    const uniqueTokenIds = [];
    let numTokensFound = 0;
    let foundBuildingToken = false;
    const units = this.getGameSession()
      .getBoard()
      .getFriendlyEntitiesForEntity(this.getCard(), CardType.Unit);
    for (var unit of Array.from<any>(units)) {
      if (unit != null && !unit.getIsGeneral() && unit.getRarityId() === Rarity.TokenUnit) {
        var unitId = unit.getBaseCardId();
        var tokenAlreadyCounted = false;
        for (var tokenId of Array.from<any>(uniqueTokenIds)) {
          if (unitId === tokenId) {
            tokenAlreadyCounted = true;
            break;
          }
        }
        if (!tokenAlreadyCounted) {
          if (this.unitIsABuildingToken(unitId)) {
            foundBuildingToken = true;
          } else {
            uniqueTokenIds.push(unitId);
          }
          numTokensFound = uniqueTokenIds.length;
          if (foundBuildingToken) {
            numTokensFound++;
          }
        }
      }
    }
    return numTokensFound;
  }

  unitIsABuildingToken(unitId) {
    return (
      unitId === Cards.Faction1.VigilatorBuilding ||
      unitId === Cards.Faction1.MonumentBuilding ||
      unitId === Cards.Faction2.ManakiteBuilding ||
      unitId === Cards.Faction2.PenumbraxxBuilding ||
      unitId === Cards.Faction3.ShrikeBuilding ||
      unitId === Cards.Faction3.SimulacraBuilding ||
      unitId === Cards.Faction4.VoidTalonBuilding ||
      unitId === Cards.Faction4.GateBuilding ||
      unitId === Cards.Faction5.HulkBuilding ||
      unitId === Cards.Faction5.GigalothBuilding ||
      unitId === Cards.Faction6.ProtosensorBuilding ||
      unitId === Cards.Faction6.EyolithBuilding ||
      unitId === Cards.Neutral.RescueRXBuilding ||
      unitId === Cards.Neutral.ArchitectBuilding
    );
  }

  getIsActionRelevant(action) {
    if (
      action instanceof ApplyCardToBoardAction ||
      action instanceof CloneEntityAction ||
      action instanceof SwapUnitAllegianceAction ||
      action instanceof RemoveAction
    ) {
      return true;
    }
    return false;
  }

  removeQuestStatusModifier() {
    const general = this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId());
    if (general.hasActiveModifierClass(ModifierQuestStatusVanar)) {
      return Array.from<any>(general.getModifiersByClass(ModifierQuestStatusVanar)).map((mod) =>
        this.getGameSession().removeModifier(mod),
      );
    }
  }

  applyQuestStatusModifier(questCompleted) {
    const general = this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId());
    const countModifier = ModifierQuestStatusVanar.createContextObject(
      questCompleted,
      this.numTokensFound,
    );
    return this.getGameSession().applyModifierContextObject(countModifier, general);
  }
}
ModifierFateVanarTokenQuest.prototype.type = 'ModifierFateVanarTokenQuest';
ModifierFateVanarTokenQuest.prototype.numTokensRequired = 1;
ModifierFateVanarTokenQuest.prototype.numTokensFound = 0;

module.exports = ModifierFateVanarTokenQuest;
