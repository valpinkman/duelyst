/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const RandomTeleportAction = require('@duelyst/sdk/actions/randomTeleportAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const _ = require('underscore');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitTeleportMinionsToThis extends ModifierOpeningGambit {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitTeleportMinionsToThis';

  onOpeningGambit() {
    const entities = this.getGameSession().getBoard().getUnits(true);
    return (() => {
      const result = [];
      for (var entity of Array.from<any>(entities)) {
        if (!entity.getIsGeneral() && entity !== this.getCard()) {
          var randomTeleportAction = new RandomTeleportAction(this.getGameSession());
          randomTeleportAction.setOwnerId(this.getCard().getOwnerId());
          randomTeleportAction.setSource(entity);
          randomTeleportAction.setFXResource(
            _.union(randomTeleportAction.getFXResource(), this.getFXResource()),
          );
          randomTeleportAction.setPatternSourcePosition(this.getCard().getPosition());
          randomTeleportAction.setTeleportPattern(CONFIG.PATTERN_3x3);
          result.push(this.getGameSession().executeAction(randomTeleportAction));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
}
ModifierOpeningGambitTeleportMinionsToThis.prototype.type =
  'ModifierOpeningGambitTeleportMinionsToThis';
ModifierOpeningGambitTeleportMinionsToThis.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
];

module.exports = ModifierOpeningGambitTeleportMinionsToThis;
