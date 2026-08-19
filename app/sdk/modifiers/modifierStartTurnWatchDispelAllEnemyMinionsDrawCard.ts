/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const UtilsGameSession = require('app/common/utils/utils_game_session');
const Stringifiers = require('app/sdk/helpers/stringifiers');
const CardType = require('app/sdk/cards/cardType');
const CONFIG = require('app/common/config');
const Cards = require('app/sdk/cards/cardsLookupComplete');
const Factions = require('app/sdk/cards/factionsLookup');
const DrawCardAction = require('app/sdk/actions/drawCardAction');
const _ = require('underscore');
const ModifierSilence = require('./modifierSilence');
const ModifierStartTurnWatch = require('./modifierStartTurnWatch');

class ModifierStartTurnWatchDispelAllEnemyMinionsDrawCard extends ModifierStartTurnWatch {
  declare type: any;

  static type = 'ModifierStartTurnWatchDispelAllEnemyMinionsDrawCard';
  static description = 'At the start of your turn, dispel all enemy minions and draw a card';

  onTurnWatch(action) {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      for (var enemyUnit of Array.from<any>(this.getGameSession().getBoard().getEnemyEntitiesForEntity(this.getCard(), CardType.Unit))) {
        if (!enemyUnit.getIsGeneral()) {
          this.getGameSession().applyModifierContextObject(ModifierSilence.createContextObject(), enemyUnit);
        }
      }
      const a = new DrawCardAction(this.getGameSession(), this.getCard().getOwnerId());
      return this.getGameSession().executeAction(a);
    }
  }
}
ModifierStartTurnWatchDispelAllEnemyMinionsDrawCard.prototype.type = 'ModifierStartTurnWatchDispelAllEnemyMinionsDrawCard';

module.exports = ModifierStartTurnWatchDispelAllEnemyMinionsDrawCard;
