/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Cards = require('app/sdk/cards/cardsLookupComplete');
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const ModifierOpeningGambit = require('./modifierOpeningGambit');
const ModifierEgg = require('./modifierEgg');

class ModifierOpeningGambitProgenitor extends ModifierOpeningGambit {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitProgenitor';

  onOpeningGambit() {
    const ownerId = this.getOwnerId();
    const myPosition = this.getCard().getPosition();

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const friendlyMinions = [];
      for (var unit of Array.from<any>(this.getGameSession().getBoard().getUnits())) {
        if (((unit != null ? unit.getOwnerId() : undefined) === ownerId) && (unit.getBaseCardId() !== Cards.Faction5.Egg) && !unit.getIsGeneral() && !((unit.getPosition().x === myPosition.x) && (unit.getPosition().y === myPosition.y))) {
          friendlyMinions.push(unit);
        }
      }

      let playerOffset = 0;
      if (this.getCard().isOwnedByPlayer1()) { playerOffset = -1; } else { playerOffset = 1; }

      return (() => {
        const result = [];
        for (var minion of Array.from<any>(friendlyMinions)) {
          var spawnPosition = { x: minion.getPosition().x + playerOffset, y: minion.getPosition().y };
          if (!this.getGameSession().getBoard().getObstructionAtPositionForEntity(spawnPosition, minion)) {
            var egg: Record<string, any> = { id: Cards.Faction5.Egg };
            if (egg.additionalInherentModifiersContextObjects == null) { egg.additionalInherentModifiersContextObjects = []; }
            egg.additionalInherentModifiersContextObjects.push(ModifierEgg.createContextObject(minion.createNewCardData(), minion.getName()));

            var spawnAction = new PlayCardSilentlyAction(this.getGameSession(), ownerId, spawnPosition.x, spawnPosition.y, egg);
            spawnAction.setSource(this.getCard());
            result.push(this.getGameSession().executeAction(spawnAction));
          } else {
            result.push(undefined);
          }
        }
        return result;
      })();
    }
  }
}
ModifierOpeningGambitProgenitor.prototype.type = 'ModifierOpeningGambitProgenitor';
ModifierOpeningGambitProgenitor.prototype.fxResource = ['FX.Modifiers.ModifierOpeningGambit'];

module.exports = ModifierOpeningGambitProgenitor;
