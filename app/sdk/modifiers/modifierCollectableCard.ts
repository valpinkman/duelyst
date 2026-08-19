/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const Cards = require('app/sdk/cards/cardsLookupComplete');
const i18next = require('i18next');
const ModifierCollectable = require('./modifierCollectable');

class ModifierCollectableCard extends ModifierCollectable {
  declare type: any;
  declare isRemovable: any;
  declare fxResource: any;

  static type = 'ModifierCollectableCard';

  static createContextObject(cardDataOrIndex, options) {
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndex = cardDataOrIndex;
    return contextObject;
  }

  onCollect(entity) {
    super.onCollect(entity);

    const a = new PutCardInHandAction(this.getGameSession(), entity.getOwnerId(), this.cardDataOrIndex);
    return this.getGameSession().executeAction(a);
  }
}
ModifierCollectableCard.prototype.type = 'ModifierCollectableCard';
ModifierCollectableCard.prototype.isRemovable = false;
ModifierCollectableCard.prototype.fxResource = ['FX.Modifiers.ModifierCollectableCard'];

module.exports = ModifierCollectableCard;
