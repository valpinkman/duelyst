/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PutCardInHandAction = require('@duelyst/sdk/actions/putCardInHandAction');
const Factions = require('@duelyst/sdk/cards/factionsLookup');
const Races = require('@duelyst/sdk/cards/racesLookup');
const i18next = require('i18next');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierInkhornGaze extends ModifierDyingWish {
  declare type: any;
  declare fxResource: any;
  declare spawnOwnerId: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierInkhornGaze';

  static createContextObject(cardDataOrIndexToSpawn, spawnOwnerId, options) {
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToSpawn = cardDataOrIndexToSpawn;
    contextObject.spawnOwnerId = spawnOwnerId;
    return contextObject;
  }

  onDyingWish() {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      // pull faction battle pets + neutral token battle pets
      const factionBattlePetCards = this.getGameSession()
        .getCardCaches()
        .getFaction(Factions.Faction4)
        .getRace(Races.BattlePet)
        .getIsToken(false)
        .getIsPrismatic(false)
        .getIsSkinned(false)
        .getCards();
      const neutralBattlePetCards = this.getGameSession()
        .getCardCaches()
        .getFaction(Factions.Neutral)
        .getRace(Races.BattlePet)
        .getIsToken(true)
        .getIsPrismatic(false)
        .getIsSkinned(false)
        .getCards();
      const battlePetCards = [].concat(factionBattlePetCards, neutralBattlePetCards);

      const card =
        battlePetCards[this.getGameSession().getRandomIntegerForExecution(battlePetCards.length)];
      const a = new PutCardInHandAction(
        this.getGameSession(),
        this.spawnOwnerId,
        card.createNewCardData(),
      );
      return this.getGameSession().executeAction(a);
    }
  }
}
ModifierInkhornGaze.prototype.type = 'ModifierInkhornGaze';
ModifierInkhornGaze.modifierName = i18next.t('modifiers.inkhorn_gaze_name');
ModifierInkhornGaze.description = i18next.t('modifiers.inkhorn_gaze_def');
ModifierInkhornGaze.prototype.fxResource = [
  'FX.Modifiers.ModifierDyingWish',
  'FX.Modifiers.ModifierGenericSpawn',
];
ModifierInkhornGaze.prototype.spawnOwnerId = null;

module.exports = ModifierInkhornGaze;
