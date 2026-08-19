/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RemoveAction = require('app/sdk/actions/removeAction');
const PlayCardAsTransformAction = require('app/sdk/actions/playCardAsTransformAction');
const GameSession = require('app/sdk/gameSession');
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierRemoveAndReplaceEntity extends Modifier {
  static type = 'ModifierRemoveAndReplaceEntity';
  static modifierName = '';
  static description = '';
  static isHiddenToUI = false;

  static createContextObject(cardDataOrIndexToSpawn, originalCardId) {
    if (originalCardId == null) { originalCardId = undefined; }
    const contextObject = super.createContextObject();
    contextObject.cardDataOrIndexToSpawn = cardDataOrIndexToSpawn;
    contextObject.originalCardId = originalCardId;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject && modifierContextObject.originalCardId) {
      const cardName = GameSession.getCardCaches().getCardById(modifierContextObject.originalCardId).getName();
      return i18next.t('modifiers.temp_transformed', { unit_name: cardName });
    }
  }

  onExpire() {
    super.onExpire();
    return this.removeAndReplace();
  }

  removeAndReplace() {
    this.remove();
    return this.replace();
  }

  remove() {
    const removeOriginalEntityAction = new RemoveAction(this.getGameSession());
    removeOriginalEntityAction.setOwnerId(this.getCard().getOwnerId());
    removeOriginalEntityAction.setTarget(this.getCard());
    return this.getGameSession().executeAction(removeOriginalEntityAction);
  }

  replace() {
    const spawnEntityAction = new PlayCardAsTransformAction(this.getCard().getGameSession(), this.getCard().getOwnerId(), this.getCard().getPosition().x, this.getCard().getPosition().y, this.cardDataOrIndexToSpawn);
    return this.getGameSession().executeAction(spawnEntityAction);
  }
}
ModifierRemoveAndReplaceEntity.prototype.type = 'ModifierRemoveAndReplaceEntity';
ModifierRemoveAndReplaceEntity.prototype.maxStacks = 1;
ModifierRemoveAndReplaceEntity.prototype.isRemovable = false;
ModifierRemoveAndReplaceEntity.prototype.activeInHand = false;
ModifierRemoveAndReplaceEntity.prototype.activeInDeck = false;
ModifierRemoveAndReplaceEntity.prototype.activeInSignatureCards = false;
ModifierRemoveAndReplaceEntity.prototype.activeOnBoard = true;
ModifierRemoveAndReplaceEntity.prototype.cardDataOrIndexToSpawn = null;

module.exports = ModifierRemoveAndReplaceEntity;
