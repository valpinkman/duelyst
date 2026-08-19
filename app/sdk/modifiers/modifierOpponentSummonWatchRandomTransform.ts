/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsJavascript = require('app/common/utils/utils_javascript');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const UtilsPosition = require('app/common/utils/utils_position');
const CardType = require('app/sdk/cards/cardType');
const PlayCardAsTransformAction = require('app/sdk/actions/playCardAsTransformAction');
const CloneEntityAsTransformAction = require('app/sdk/actions/cloneEntityAsTransformAction');
const RemoveAction = require('app/sdk/actions/removeAction');
const Factions = require('app/sdk/cards/factionsLookup');
const Cards = require('app/sdk/cards/cardsLookupComplete');
const Modifier = require('./modifier');
const ModifierOpponentSummonWatch = require('./modifierOpponentSummonWatch');
const ModifierSummonWatch = require('./modifierSummonWatch');

class ModifierOpponentSummonWatchRandomTransform extends ModifierOpponentSummonWatch {
  declare type: any;
  declare cardDataOrIndexToSpawn: any;
  declare fxResource: any;

  static type = 'ModifierOpponentSummonWatchRandomTransform';
  static modifierName = 'Opponent Summon Watch';
  static description = 'Whenever an enemy summons a minion, transform it into a random minion of the same cost';

  static createContextObject(options) {
    const contextObject = super.createContextObject(options);

    return contextObject;
  }

  onSummonWatch(action) {
    super.onSummonWatch(action);

    const targetUnit = action.getTarget();
    const targetManaCost = targetUnit.getManaCost();
    const targetOwnerId = targetUnit.getOwnerId();
    const targetPosition = targetUnit.getPosition();

    if (targetUnit != null) {
      // find valid minions
      let card;
      const cardCache = this.getGameSession().getCardCaches().getIsHiddenInCollection(false).getIsGeneral(false)
        .getIsPrismatic(false)
        .getIsSkinned(false)
        .getType(CardType.Unit)
        .getCards();
      const cards = [];
      for (card of Array.from<any>(cardCache)) {
        if (card.getManaCost() === targetManaCost) {
          cards.push(card);
        }
      }

      if (cards.length > 0) {
        // remove original entity
        const removeOriginalEntityAction = new RemoveAction(this.getGameSession());
        removeOriginalEntityAction.setOwnerId(this.getOwnerId());
        removeOriginalEntityAction.setTarget(targetUnit);
        this.getGameSession().executeAction(removeOriginalEntityAction);

        // pick randomly from among the units we found with right mana cost
        card = cards[this.getGameSession().getRandomIntegerForExecution(cards.length)];
        this.cardDataOrIndexToSpawn = card.createNewCardData();

        const spawnEntityAction = new PlayCardAsTransformAction(this.getCard().getGameSession(), targetOwnerId, targetPosition.x, targetPosition.y, this.cardDataOrIndexToSpawn);
        return this.getGameSession().executeAction(spawnEntityAction);
      }
    }
  }

  getIsCardRelevantToWatcher(card) {
    return true;
  }
}
ModifierOpponentSummonWatchRandomTransform.prototype.type = 'ModifierOpponentSummonWatchRandomTransform';
ModifierOpponentSummonWatchRandomTransform.prototype.cardDataOrIndexToSpawn = null;
ModifierOpponentSummonWatchRandomTransform.prototype.fxResource = ['FX.Modifiers.ModifierSummonWatch', 'FX.Modifiers.ModifierGenericSpawn'];
// default when no card restrictions are needed

module.exports = ModifierOpponentSummonWatchRandomTransform;
