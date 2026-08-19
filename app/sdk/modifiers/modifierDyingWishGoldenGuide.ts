/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Races = require('app/sdk/cards/racesLookup');
const Cards = require('app/sdk/cards/cardsLookupComplete');
const RemoveAction = require('app/sdk/actions/removeAction');
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierDyingWishGoldenGuide extends ModifierDyingWish {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierDyingWishGoldenGuide';

  onDyingWish(action) {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const friendlyDervishes = [];
      for (var unit of Array.from<any>(this.getGameSession().getBoard().getUnits())) {
        if ((unit != null) && unit.getIsSameTeamAs(this.getCard()) && !unit.getIsGeneral() && this.getGameSession().getCanCardBeScheduledForRemoval(unit) && unit.getBelongsToTribe(Races.Dervish)) {
          friendlyDervishes.push(unit);
        }
      }

      if (friendlyDervishes.length > 0) {
        const unitToRemove = friendlyDervishes[this.getGameSession().getRandomIntegerForExecution(friendlyDervishes.length)];
        const position = unitToRemove.getPosition();

        const removeAction = new RemoveAction(this.getGameSession());
        removeAction.setOwnerId(this.getCard().getOwnerId());
        removeAction.setTarget(unitToRemove);
        this.getGameSession().executeAction(removeAction);

        const spawnAction = new PlayCardSilentlyAction(this.getGameSession(), this.getCard().getOwnerId(), position.x, position.y, { id: Cards.Faction3.GoldenGuide });
        spawnAction.setSource(this.getCard());
        return this.getGameSession().executeAction(spawnAction);
      }
    }
  }
}
ModifierDyingWishGoldenGuide.prototype.type = 'ModifierDyingWishGoldenGuide';
ModifierDyingWishGoldenGuide.prototype.fxResource = ['FX.Modifiers.ModifierDyingWish'];

module.exports = ModifierDyingWishGoldenGuide;
