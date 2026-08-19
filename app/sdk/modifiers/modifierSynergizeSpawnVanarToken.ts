/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const CardType = require('app/sdk/cards/cardType');
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const Cards = require('app/sdk/cards/cardsLookupComplete');
const Factions = require('app/sdk/cards/factionsLookup');
const Modifier = require('./modifier');
const ModifierSynergize = require('./modifierSynergize');

class ModifierSynergizeSpawnVanarToken extends ModifierSynergize {
  declare type: any;
  declare cardDataOrIndexToSpawn: any;
  declare fxResource: any;

  static type = 'ModifierSynergizeSpawnVanarToken';
  static description = 'Summon a random Wall nearby';

  onSynergize(action) {
    super.onSynergize(action);

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const possibleTokens = [
        { id: Cards.Faction6.BlazingSpines },
        { id: Cards.Faction6.BonechillBarrier },
        { id: Cards.Faction6.GravityWell },
        { id: Cards.Faction6.FrostBomb },
      ];
      const card = this.getGameSession().getExistingCardFromIndexOrCreateCardFromData(possibleTokens[this.getGameSession().getRandomIntegerForExecution(possibleTokens.length)]);
      const spawnLocations = UtilsGameSession.getRandomSmartSpawnPositionsFromPattern(this.getGameSession(), this.getCard().getPosition(), CONFIG.PATTERN_3x3, card, this.getCard(), 1);

      return (() => {
        const result = [];
        for (var position of Array.from<any>(spawnLocations)) {
          var playCardAction = new PlayCardSilentlyAction(this.getGameSession(), this.getCard().getOwnerId(), position.x, position.y, card.createNewCardData());
          playCardAction.setSource(this.getCard());
          result.push(this.getGameSession().executeAction(playCardAction));
        }
        return result;
      })();
    }
  }
}
ModifierSynergizeSpawnVanarToken.prototype.type = 'ModifierSynergizeSpawnVanarToken';
ModifierSynergizeSpawnVanarToken.prototype.cardDataOrIndexToSpawn = null;
ModifierSynergizeSpawnVanarToken.prototype.fxResource = ['FX.Modifiers.ModifierSpellWatch', 'FX.Modifiers.ModifierGenericSpawn'];

module.exports = ModifierSynergizeSpawnVanarToken;
