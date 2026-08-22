/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const PutCardInHandAction = require('@duelyst/sdk/actions/putCardInHandAction');
const Factions = require('@duelyst/sdk/cards/factionsLookup');
const Races = require('@duelyst/sdk/cards/racesLookup');
const i18next = require('i18next');
const ModifierDealDamageWatch = require('./modifierDealDamageWatch');

class ModifierSnowRippler extends ModifierDealDamageWatch {
  declare type: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierSnowRippler';

  onDealDamage(action) {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      if (action.getTarget().getIsGeneral()) {
        // if damaging a general
        // pull faction battle pets + neutral token battle pets
        const factionBattlePetCards = this.getGameSession()
          .getCardCaches()
          .getFaction(Factions.Faction6)
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
        const battlePetCard =
          battlePetCards[this.getGameSession().getRandomIntegerForExecution(battlePetCards.length)];
        const a = new PutCardInHandAction(
          this.getGameSession(),
          this.getCard().getOwnerId(),
          battlePetCard.createNewCardData(),
        );
        return this.getGameSession().executeAction(a);
      }
    }
  }
}
ModifierSnowRippler.prototype.type = 'ModifierSnowRippler';
ModifierSnowRippler.modifierName = i18next.t('modifiers.snow_rippler_name');
ModifierSnowRippler.description = i18next.t('modifiers.snow_rippler_def');

module.exports = ModifierSnowRippler;
