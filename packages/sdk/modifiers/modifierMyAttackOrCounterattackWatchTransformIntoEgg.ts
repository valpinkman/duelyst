/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Cards = require('@duelyst/sdk/cards/cardsLookupComplete');
const RemoveAction = require('@duelyst/sdk/actions/removeAction');
const PlayCardAsTransformAction = require('@duelyst/sdk/actions/playCardAsTransformAction');
const ModifierMyAttackOrCounterattackWatch = require('./modifierMyAttackOrCounterattackWatch');
const ModifierEgg = require('./modifierEgg');
const ModifierTransformed = require('./modifierTransformed');

class ModifierMyAttackOrCounterattackWatchTransformIntoEgg extends ModifierMyAttackOrCounterattackWatch {
  declare type: any;

  static type = 'ModifierMyAttackOrCounterattackWatchTransformIntoEgg';

  onMyAttackOrCounterattackWatch(action) {
    const entity = this.getCard();

    const egg: Record<string, any> = { id: Cards.Faction5.Egg };
    if (egg.additionalInherentModifiersContextObjects == null) {
      egg.additionalInherentModifiersContextObjects = [];
    }
    egg.additionalInherentModifiersContextObjects.push(
      ModifierEgg.createContextObject(entity.createNewCardData(), entity.getName()),
    );
    egg.additionalInherentModifiersContextObjects.push(
      ModifierTransformed.createContextObject(
        entity.getExhausted(),
        entity.getMovesMade(),
        entity.getAttacksMade(),
      ),
    );

    const removeEntityAction = new RemoveAction(this.getGameSession());
    removeEntityAction.setOwnerId(this.getCard().getOwnerId());
    removeEntityAction.setTarget(this.getCard());
    this.getGameSession().executeAction(removeEntityAction);

    const spawnEntityAction = new PlayCardAsTransformAction(
      this.getCard().getGameSession(),
      entity.getOwnerId(),
      entity.getPosition().x,
      entity.getPosition().y,
      egg,
    );
    return this.getGameSession().executeAction(spawnEntityAction);
  }
}
ModifierMyAttackOrCounterattackWatchTransformIntoEgg.prototype.type =
  'ModifierMyAttackOrCounterattackWatchTransformIntoEgg';

module.exports = ModifierMyAttackOrCounterattackWatchTransformIntoEgg;
