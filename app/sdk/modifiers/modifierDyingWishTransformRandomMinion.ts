/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const RemoveAction = require('app/sdk/actions/removeAction');
const PlayCardAsTransformAction = require('app/sdk/actions/playCardAsTransformAction');
const ModifierTransformed = require('app/sdk/modifiers/modifierTransformed');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierDyingWishTransformRandomMinion extends ModifierDyingWish {
  declare type: any;
  declare fxResource: any;
  declare minionToTransformTo: any;
  declare includeAllies: any;
  declare includeEnemies: any;
  declare race: any;

  static type = 'ModifierDyingWishTransformRandomMinion';

  static createContextObject(minionToTransformTo, includeAllies, includeEnemies, race, options) {
    if (includeAllies == null) {
      includeAllies = true;
    }
    if (includeEnemies == null) {
      includeEnemies = true;
    }
    const contextObject = super.createContextObject(options);
    contextObject.minionToTransformTo = minionToTransformTo;
    contextObject.includeAllies = includeAllies;
    contextObject.includeEnemies = includeEnemies;
    contextObject.race = race;
    return contextObject;
  }

  onDyingWish(action) {
    if (this.minionToTransformTo != null) {
      const potentialUnits = [];
      // find all potential minions
      for (var unit of Array.from<any>(this.getGameSession().getBoard().getUnits())) {
        if (unit != null) {
          if (this.includeAllies) {
            if (
              unit.getIsSameTeamAs(this.getCard()) &&
              !unit.getIsGeneral() &&
              this.getGameSession().getCanCardBeScheduledForRemoval(unit) &&
              (this.race == null || unit.getBelongsToTribe(this.race))
            ) {
              potentialUnits.push(unit);
            }
          }

          if (this.includeEnemies) {
            if (
              !unit.getIsSameTeamAs(this.getCard()) &&
              !unit.getIsGeneral() &&
              this.getGameSession().getCanCardBeScheduledForRemoval(unit) &&
              (this.race == null || unit.getBelongsToTribe(this.race))
            ) {
              potentialUnits.push(unit);
            }
          }
        }
      }

      // if we found at least one minion on the board
      if (potentialUnits.length > 0) {
        // pick one
        const existingEntity =
          potentialUnits[this.getGameSession().getRandomIntegerForExecution(potentialUnits.length)];
        const targetPosition = existingEntity.getPosition();

        // remove it
        const removeOriginalEntityAction = new RemoveAction(this.getGameSession());
        removeOriginalEntityAction.setOwnerId(this.getCard().getOwnerId());
        removeOriginalEntityAction.setTarget(existingEntity);
        this.getGameSession().executeAction(removeOriginalEntityAction);

        // transform it
        if (existingEntity != null) {
          const cardData = this.minionToTransformTo;
          if (cardData.additionalInherentModifiersContextObjects == null) {
            cardData.additionalInherentModifiersContextObjects = [];
          }
          cardData.additionalInherentModifiersContextObjects.push(
            ModifierTransformed.createContextObject(
              existingEntity.getExhausted(),
              existingEntity.getMovesMade(),
              existingEntity.getAttacksMade(),
            ),
          );
          const spawnEntityAction = new PlayCardAsTransformAction(
            this.getCard().getGameSession(),
            this.getCard().getOwnerId(),
            targetPosition.x,
            targetPosition.y,
            cardData,
          );
          return this.getGameSession().executeAction(spawnEntityAction);
        }
      }
    }
  }
}
ModifierDyingWishTransformRandomMinion.prototype.type = 'ModifierDyingWishTransformRandomMinion';
ModifierDyingWishTransformRandomMinion.prototype.fxResource = [
  'FX.Modifiers.ModifierDyingWish',
  'FX.Modifiers.ModifierGenericBuff',
];
ModifierDyingWishTransformRandomMinion.prototype.minionToTransformTo = null;
ModifierDyingWishTransformRandomMinion.prototype.includeAllies = true;
ModifierDyingWishTransformRandomMinion.prototype.includeEnemies = true;
ModifierDyingWishTransformRandomMinion.prototype.race = null;

module.exports = ModifierDyingWishTransformRandomMinion;
