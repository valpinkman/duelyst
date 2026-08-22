/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardAsTransformAction = require('@duelyst/sdk/actions/playCardAsTransformAction');
const RemoveAction = require('@duelyst/sdk/actions/removeAction');
const Cards = require('@duelyst/sdk/cards/cardsLookupComplete');
const CardType = require('@duelyst/sdk/cards/cardType');
const ModifierBuilding = require('./modifierBuilding');
const ModifierBackstabWatch = require('./modifierBackstabWatch');

class ModifierBackstabWatchTransformToBuilding extends ModifierBackstabWatch {
  declare type: any;
  declare cardDataOrIndexToSpawn: any;
  declare buildModifierDescription: any;

  static type = 'ModifierBackstabWatchTransformToBuilding';

  static createContextObject(buildingToSpawn, buildModifierDescription, options) {
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToSpawn = buildingToSpawn;
    contextObject.buildModifierDescription = buildModifierDescription;
    return contextObject;
  }

  onBackstabWatch(action) {
    // create the action to spawn the new entity before the existing entity is removed
    // because we may need information about the existing entity being replaced
    if (this.cardDataOrIndexToSpawn.additionalInherentModifiersContextObjects == null) {
      this.cardDataOrIndexToSpawn.additionalInherentModifiersContextObjects = [];
    }
    this.cardDataOrIndexToSpawn.additionalInherentModifiersContextObjects.push(
      ModifierBuilding.createContextObject(
        this.buildModifierDescription,
        { id: Cards.Faction2.Penumbraxx },
        1,
      ),
    );
    const spawnAction = new PlayCardAsTransformAction(
      this.getGameSession(),
      this.getCard().getOwnerId(),
      this.getCard().getPositionX(),
      this.getCard().getPositionY(),
      this.cardDataOrIndexToSpawn,
    );

    // remove the existing entity
    const removingEntity = this.getGameSession()
      .getBoard()
      .getCardAtPosition(this.getCard().getPosition(), CardType.Unit);
    if (removingEntity != null) {
      const removeOriginalEntityAction = new RemoveAction(this.getGameSession());
      removeOriginalEntityAction.setOwnerId(this.getCard().getOwnerId());
      removeOriginalEntityAction.setTarget(removingEntity);
      this.getGameSession().executeAction(removeOriginalEntityAction);
    }

    // spawn the new entity
    if (spawnAction != null) {
      return this.getGameSession().executeAction(spawnAction);
    }
  }
}
ModifierBackstabWatchTransformToBuilding.prototype.type =
  'ModifierBackstabWatchTransformToBuilding';
ModifierBackstabWatchTransformToBuilding.prototype.cardDataOrIndexToSpawn = null;
ModifierBackstabWatchTransformToBuilding.prototype.buildModifierDescription = null;

module.exports = ModifierBackstabWatchTransformToBuilding;
