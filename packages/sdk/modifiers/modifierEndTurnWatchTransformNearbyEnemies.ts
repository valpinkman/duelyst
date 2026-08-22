/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const RemoveAction = require('@duelyst/sdk/actions/removeAction');
const PlayCardAsTransformAction = require('@duelyst/sdk/actions/playCardAsTransformAction');
const ModifierTransformed = require('@duelyst/sdk/modifiers/modifierTransformed');
const ModifierEndTurnWatch = require('./modifierEndTurnWatch');

class ModifierEndTurnWatchTransformNearbyEnemies extends ModifierEndTurnWatch {
  declare type: any;
  declare cardToBecome: any;
  declare fxResource: any;

  static type = 'ModifierEndTurnWatchTransformNearbyEnemies';
  static modifierName = 'End Turn Watch Transform Enemies';
  static description = 'At the end of your turn, transform nearby enemies';

  static createContextObject(cardToBecome, options) {
    const contextObject = super.createContextObject(options);
    contextObject.cardToBecome = cardToBecome;
    return contextObject;
  }

  onTurnWatch(action) {
    const opponentId = this.getGameSession()
      .getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId())
      .getOwnerId();
    const entities = this.getGameSession()
      .getBoard()
      .getEnemyEntitiesAroundEntity(this.getCard(), CardType.Unit, 1);
    return (() => {
      const result = [];
      for (var entity of Array.from<any>(entities)) {
        if (!entity.getIsGeneral()) {
          // remove it
          var removeOriginalEntityAction = new RemoveAction(this.getGameSession());
          removeOriginalEntityAction.setOwnerId(this.getCard().getOwnerId());
          removeOriginalEntityAction.setTarget(entity);
          this.getGameSession().executeAction(removeOriginalEntityAction);

          // and turn it into a Panddo
          if (entity != null) {
            var cardData = this.cardToBecome;
            if (cardData.additionalInherentModifiersContextObjects == null) {
              cardData.additionalInherentModifiersContextObjects = [];
            }
            cardData.additionalInherentModifiersContextObjects.push(
              ModifierTransformed.createContextObject(
                entity.getExhausted(),
                entity.getMovesMade(),
                entity.getAttacksMade(),
              ),
            );
            var spawnEntityAction = new PlayCardAsTransformAction(
              this.getCard().getGameSession(),
              opponentId,
              entity.getPosition().x,
              entity.getPosition().y,
              cardData,
            );
            result.push(this.getGameSession().executeAction(spawnEntityAction));
          } else {
            result.push(undefined);
          }
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
}
ModifierEndTurnWatchTransformNearbyEnemies.prototype.type =
  'ModifierEndTurnWatchTransformNearbyEnemies';
ModifierEndTurnWatchTransformNearbyEnemies.prototype.cardToBecome = null;
ModifierEndTurnWatchTransformNearbyEnemies.prototype.fxResource = [
  'FX.Modifiers.ModifierEndTurnWatch',
];

module.exports = ModifierEndTurnWatchTransformNearbyEnemies;
