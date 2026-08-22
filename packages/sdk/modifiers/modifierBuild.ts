/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardFromHandAction = require('@duelyst/sdk/actions/playCardFromHandAction');
const Cards = require('@duelyst/sdk/cards/cardsLookupComplete');
const i18next = require('i18next');
const Modifier = require('./modifier');
const ModifierManaCostChange = require('./modifierManaCostChange');
const ModifierBuilding = require('./modifierBuilding');

class ModifierBuild extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare isRemovable: any;
  declare maxStacks: any;
  declare fxResource: any;
  declare static keywordDefinition: any;
  declare static modifierName: any;

  static type = 'ModifierBuild';
  static isKeyworded = true;
  static isHiddenToUI = true;
  static description = null;

  static createContextObject(buildCardData, options) {
    const contextObject = super.createContextObject(options);
    contextObject.buildCardData = buildCardData;
    return contextObject;
  }

  onModifyActionForExecution(event) {
    const { action } = event;
    if (
      action != null &&
      action instanceof PlayCardFromHandAction &&
      action.getIsValid() &&
      action.getCard() === this.getCard()
    ) {
      for (var mod of Array.from<any>(this.getCard().getModifiers())) {
        // find all non-inherent modifiers added to this unit in hand (can ignore mana modifiers as they are deleted upon the unit being played)
        if (
          !(mod.getIsInherent() || mod.getIsAdditionalInherent()) &&
          mod.getType() !== ModifierManaCostChange.type
        ) {
          for (var additionalInherentModifiersContextObject of Array.from<any>(
            this.buildCardData.additionalInherentModifiersContextObjects,
          )) {
            var additionalMod = this.getGameSession().getOrCreateModifierFromContextObjectOrIndex(
              additionalInherentModifiersContextObject,
            );
            // find the sentinel modifier context object, and add the hand buffs so that they will transfer to the TRANSFORMED unit after sentinel triggers
            if (additionalMod instanceof ModifierBuilding) {
              if (
                additionalInherentModifiersContextObject.transformCardData
                  .additionalModifiersContextObjects == null
              ) {
                additionalInherentModifiersContextObject.transformCardData.additionalModifiersContextObjects =
                  [];
              }
              additionalInherentModifiersContextObject.transformCardData.additionalModifiersContextObjects.push(
                mod.createContextObjectForClone(),
              );
            }
          }
        }
      }
      if (Cards.getIsPrismaticCardId(this.getCard().getId())) {
        this.buildCardData.id = Cards.getPrismaticCardId(this.buildCardData.id);
      }
      const newCard = this.getGameSession().getExistingCardFromIndexOrCreateCardFromData(
        this.buildCardData,
      );
      newCard.ownerId = this.getCard().getOwnerId();
      // re-index card here as card has changed from original card played from hand
      // cards are normally indexed as soon as action is verified valid by game session, but we are swapping card being played from hand
      // so we must re-index the hidden sentinel card that is actually being played to board
      this.getGameSession()._indexCardAsNeeded(newCard);
      // set the new card to be played in the play card action
      action.overrideCard(newCard);
      return action.setCardDataOrIndex(this.buildCardData);
    }
  }
}
ModifierBuild.prototype.type = 'ModifierBuild';
ModifierBuild.prototype.activeInHand = true;
ModifierBuild.prototype.activeInDeck = false;
ModifierBuild.prototype.activeInSignatureCards = false;
ModifierBuild.prototype.activeOnBoard = false;
ModifierBuild.prototype.isRemovable = false;
ModifierBuild.prototype.maxStacks = 1;
ModifierBuild.keywordDefinition = i18next.t('modifiers.build_def');
ModifierBuild.modifierName = i18next.t('modifiers.build_name');
ModifierBuild.prototype.fxResource = ['FX.Modifiers.ModifierPortal'];

module.exports = ModifierBuild;
