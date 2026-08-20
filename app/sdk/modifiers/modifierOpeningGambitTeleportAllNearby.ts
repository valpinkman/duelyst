/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const RandomTeleportAction = require('app/sdk/actions/randomTeleportAction');
const CardType = require('app/sdk/cards/cardType');
const _ = require('underscore');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class OpeningGambitTeleportAllNearby extends ModifierOpeningGambit {
  declare type: any;
  declare damageAmount: any;
  declare fxResource: any;

  static type = 'OpeningGambitTeleportAllNearby';
  static modifierName = 'Opening Gambit';
  static description = ' Push ALL nearby minions and Generals to random spaces';

  onOpeningGambit() {
    const entities = this.getGameSession()
      .getBoard()
      .getEntitiesAroundEntity(this.getCard(), CardType.Unit, 1);
    return (() => {
      const result = [];
      for (var entity of Array.from<any>(entities)) {
        var randomTeleportAction = new RandomTeleportAction(this.getGameSession());
        randomTeleportAction.setOwnerId(this.getCard().getOwnerId());
        randomTeleportAction.setSource(entity);
        randomTeleportAction.setFXResource(
          _.union(randomTeleportAction.getFXResource(), this.getFXResource()),
        );
        result.push(this.getGameSession().executeAction(randomTeleportAction));
      }
      return result;
    })();
  }
}
OpeningGambitTeleportAllNearby.prototype.type = 'OpeningGambitTeleportAllNearby';
OpeningGambitTeleportAllNearby.prototype.damageAmount = 0;
OpeningGambitTeleportAllNearby.prototype.fxResource = ['FX.Modifiers.ModifierOpeningGambit'];

module.exports = OpeningGambitTeleportAllNearby;
