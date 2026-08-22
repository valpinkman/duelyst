/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const CardType = require('@duelyst/sdk/cards/cardType');
const PlayCardSilentlyAction = require('@duelyst/sdk/actions/playCardSilentlyAction');
const Cards = require('@duelyst/sdk/cards/cardsLookupComplete');
const Factions = require('@duelyst/sdk/cards/factionsLookup');
const Modifier = require('./modifier');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitSpawnVanarTokensAroundGeneral extends ModifierOpeningGambit {
  declare type: any;
  declare cardDataOrIndexToSpawn: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitSpawnVanarTokensAroundGeneral';
  static description = 'Surround the enemy General with random Walls';

  onOpeningGambit(action) {
    super.onOpeningGambit(action);

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const spawnLocations = UtilsGameSession.getRandomSmartSpawnPositionsFromPattern(
        this.getGameSession(),
        this.getGameSession()
          .getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId())
          .getPosition(),
        CONFIG.PATTERN_3x3,
        this.getCard(),
        this.getCard(),
        8,
      );

      return (() => {
        const result = [];
        for (var position of Array.from<any>(spawnLocations)) {
          var possibleTokens = [
            { id: Cards.Faction6.BlazingSpines },
            { id: Cards.Faction6.BonechillBarrier },
            { id: Cards.Faction6.GravityWell },
            { id: Cards.Faction6.FrostBomb },
          ];
          var card = this.getGameSession().getExistingCardFromIndexOrCreateCardFromData(
            possibleTokens[
              this.getGameSession().getRandomIntegerForExecution(possibleTokens.length)
            ],
          );
          var playCardAction = new PlayCardSilentlyAction(
            this.getGameSession(),
            this.getCard().getOwnerId(),
            position.x,
            position.y,
            card.createNewCardData(),
          );
          playCardAction.setSource(this.getCard());
          result.push(this.getGameSession().executeAction(playCardAction));
        }
        return result;
      })();
    }
  }
}
ModifierOpeningGambitSpawnVanarTokensAroundGeneral.prototype.type =
  'ModifierOpeningGambitSpawnVanarTokensAroundGeneral';
ModifierOpeningGambitSpawnVanarTokensAroundGeneral.prototype.cardDataOrIndexToSpawn = null;
ModifierOpeningGambitSpawnVanarTokensAroundGeneral.prototype.fxResource = [
  'FX.Modifiers.ModifierSpellWatch',
  'FX.Modifiers.ModifierGenericSpawn',
];

module.exports = ModifierOpeningGambitSpawnVanarTokensAroundGeneral;
