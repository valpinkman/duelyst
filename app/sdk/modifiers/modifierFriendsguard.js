/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DieAction = require('app/sdk/actions/dieAction');
const PlayCardAsTransformAction = require('app/sdk/actions/playCardAsTransformAction');
const CardType = require('app/sdk/cards/cardType');
const Cards = require('app/sdk/cards/cardsLookupComplete');
const RemoveAction = require('app/sdk/actions/removeAction');
const ModifierFriendlyDeathWatch = require('./modifierFriendlyDeathWatch');

class ModifierFriendsguard extends ModifierFriendlyDeathWatch {
  static type = 'ModifierFriendsguard';

  static createContextObject(cardDataOrIndexToSpawn, options) {
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToSpawn = cardDataOrIndexToSpawn;
    return contextObject;
  }

  onFriendlyDeathWatch(action) {
    const target = action.getTarget();
    if (target.getBaseCardId() === Cards.Faction1.FriendFighter) {
      const removeOriginalEntityAction = new RemoveAction(this.getGameSession());
      removeOriginalEntityAction.setOwnerId(this.getOwnerId());
      removeOriginalEntityAction.setTarget(this.getCard());
      this.getGameSession().executeAction(removeOriginalEntityAction);

      const entityPosition = this.getCard().getPosition();
      const entityOwnerId = this.getCard().getOwnerId();
      const spawnEntityAction = new PlayCardAsTransformAction(this.getCard().getGameSession(), entityOwnerId, entityPosition.x, entityPosition.y, this.cardDataOrIndexToSpawn);
      return this.getGameSession().executeAction(spawnEntityAction);
    }
  }
}
ModifierFriendsguard.prototype.type = 'ModifierFriendsguard';
ModifierFriendsguard.prototype.fxResource = ['FX.Modifiers.ModifierFriendlyDeathwatch'];

module.exports = ModifierFriendsguard;
