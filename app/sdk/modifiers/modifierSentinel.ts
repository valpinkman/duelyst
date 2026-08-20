/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const PlayCardAsTransformAction = require('app/sdk/actions/playCardAsTransformAction');
const RemoveAction = require('app/sdk/actions/removeAction');

const i18next = require('i18next');
const ModifierSentinelHidden = require('./modifierSentinelHidden');
const ModifierOverwatch = require('./modifierOverwatch');

class ModifierSentinel extends ModifierOverwatch {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare isRemovable: any;
  declare transformCardData: any;
  declare maxStacks: any;
  declare hideAsModifierType: any;
  declare fxResource: any;
  declare static keywordDefinition: any;
  declare static modifierName: any;

  static type = 'ModifierSentinel';
  static isKeyworded = true;
  static description = null;

  static createContextObject(description, transformCardData, options) {
    const contextObject = super.createContextObject(description, options);
    contextObject.transformCardData = transformCardData;
    return contextObject;
  }

  onOverwatch(action) {
    return this.transformSelf(); // sentinels transform when overwatch triggers
  }
  // override me in sub classes to implement special behavior for when overwatch is triggered

  transformSelf() {
    // create the action to spawn the new entity before the existing entity is removed
    // because we may need information about the existing entity being replaced
    const spawnAction = new PlayCardAsTransformAction(
      this.getGameSession(),
      this.getCard().getOwnerId(),
      this.getCard().getPositionX(),
      this.getCard().getPositionY(),
      this.transformCardData,
    );

    // remove the existing entity
    const removingEntity = this.getGameSession()
      .getBoard()
      .getCardAtPosition(this.getCard().getPosition(), CardType.Unit);
    if (removingEntity != null) {
      const removeOriginalEntityAction = new RemoveAction(this.getGameSession());
      removeOriginalEntityAction.setOwnerId(this.getCard().getOwnerId());
      removeOriginalEntityAction.setTarget(removingEntity);
      removeOriginalEntityAction.setIsDepthFirst(true);
      this.getGameSession().executeAction(removeOriginalEntityAction);
    }

    // spawn the new entity
    if (spawnAction != null) {
      spawnAction.setIsDepthFirst(true);
      this.getGameSession().executeAction(spawnAction);
      return spawnAction.getTarget();
    }
  }

  getRevealedCardData() {
    return this.transformCardData;
  }
}
ModifierSentinel.prototype.type = 'ModifierSentinel';
ModifierSentinel.keywordDefinition = i18next.t('modifiers.sentinel_def');
ModifierSentinel.modifierName = i18next.t('modifiers.sentinel_name');
ModifierSentinel.prototype.activeInHand = false;
ModifierSentinel.prototype.activeInDeck = false;
ModifierSentinel.prototype.activeInSignatureCards = false;
ModifierSentinel.prototype.activeOnBoard = true;
ModifierSentinel.prototype.isRemovable = false;
ModifierSentinel.prototype.transformCardData = null;
ModifierSentinel.prototype.maxStacks = 1;
ModifierSentinel.prototype.hideAsModifierType = ModifierSentinelHidden.type;
ModifierSentinel.prototype.fxResource = ['FX.Modifiers.ModifierSentinel'];

module.exports = ModifierSentinel;
