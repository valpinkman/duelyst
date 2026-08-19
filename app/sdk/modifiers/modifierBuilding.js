/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardAsTransformAction = require('app/sdk/actions/playCardAsTransformAction');
const RemoveAction = require('app/sdk/actions/removeAction');
const CardType = require('app/sdk/cards/cardType');
const ModifierTransformed = require('app/sdk/modifiers/modifierTransformed');
const GameSession = require('app/sdk/gameSession');
const ModifierCounterBuildProgress = require('app/sdk/modifiers/modifierCounterBuildProgress');

const i18next = require('i18next');
const ModifierEternalHeart = require('./modifierEternalHeart');
const ModifierStartTurnWatch = require('./modifierStartTurnWatch');
const Modifier = require('./modifier');

class ModifierBuilding extends ModifierStartTurnWatch {
  static type = 'ModifierBuilding';
  static modifierName = 'Build';
  static description = null;

  static createContextObject(description, transformCardData, turnsToBuild, options) {
    const contextObject = super.createContextObject(options);
    contextObject.description = description;
    contextObject.turnsToBuild = turnsToBuild;
    contextObject.transformCardData = transformCardData;
    contextObject.turnsRemaining = turnsToBuild;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      const cardName = GameSession.getCardCaches().getCardById(modifierContextObject.transformCardData.id).getName();
      return i18next.t('modifiers.building_text', { unit_name: cardName });
    }
  }

  onApplyToCardBeforeSyncState() {
    this.getCard().setReferencedCardData(this.transformCardData);
    return this.getGameSession().applyModifierContextObject(ModifierCounterBuildProgress.createContextObject('ModifierBuilding'), this.getCard());
  }

  onActivate() {
    super.onActivate();

    // reset turns elapsed and duration when activating due to changed location
    // ex: played from hand to board
    if (!this._private.cachedWasActiveInLocation && this._private.cachedIsActiveInLocation) {
      this.setNumEndTurnsElapsed(0);
      return this.turnsRemaining = this.turnsToBuild;
    }
  }

  onTurnWatch(action) {
    super.onTurnWatch();
    return this.progressBuild();
  }

  progressBuild() {
    if (this.turnsRemaining > 0) {
      this.turnsRemaining--;
      if (this.turnsRemaining <= 0) {
        return this.onBuildComplete();
      }
    }
  }

  onBuildComplete() {
    return this.transformSelf();
  }

  transformSelf() {
    // create the action to spawn the new entity before the existing entity is removed
    // because we may need information about the existing entity being replaced
    if (this.transformCardData.additionalModifiersContextObjects == null) { this.transformCardData.additionalModifiersContextObjects = []; }
    this.transformCardData.additionalModifiersContextObjects.push(ModifierTransformed.createContextObject(false, 0, 0));
    const spawnAction = new PlayCardAsTransformAction(this.getGameSession(), this.getCard().getOwnerId(), this.getCard().getPositionX(), this.getCard().getPositionY(), this.transformCardData);

    // remove the existing entity
    const removingEntity = this.getGameSession().getBoard().getCardAtPosition(this.getCard().getPosition(), CardType.Unit);
    if (removingEntity != null) {
      const removeOriginalEntityAction = new RemoveAction(this.getGameSession());
      removeOriginalEntityAction.setOwnerId(this.getCard().getOwnerId());
      removeOriginalEntityAction.setTarget(removingEntity);
      this.getGameSession().executeAction(removeOriginalEntityAction);
    }

    // spawn the new entity
    if (spawnAction != null) {
      this.getGameSession().executeAction(spawnAction);
      return spawnAction.getTarget();
    }
  }
}
ModifierBuilding.prototype.type = 'ModifierBuilding';
ModifierBuilding.prototype.activeInHand = false;
ModifierBuilding.prototype.activeInDeck = false;
ModifierBuilding.prototype.activeInSignatureCards = false;
ModifierBuilding.prototype.activeOnBoard = true;
ModifierBuilding.prototype.maxStacks = 1;
ModifierBuilding.prototype.isRemovable = false;
ModifierBuilding.prototype.turnsToBuild = 1;
ModifierBuilding.prototype.turnsRemaining = 1;
ModifierBuilding.prototype.isInherent = true;
ModifierBuilding.prototype.fxResource = ['FX.Modifiers.Modifierbuilding'];

module.exports = ModifierBuilding;
