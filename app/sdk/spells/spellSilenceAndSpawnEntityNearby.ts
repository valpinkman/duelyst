/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const ModifierSilence = require('app/sdk/modifiers/modifierSilence');
const SpellSpawnEntityRandomlyAroundTarget = require('./spellSpawnEntityRandomlyAroundTarget');
const _ = require('underscore');
const Cards = require('../cards/cardsLookupComplete');
const UtilsGameSession = require('../../common/utils/utils_game_session');

class SpellSilenceAndSpawnEntityNearby extends SpellSpawnEntityRandomlyAroundTarget {
  declare targetType: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    const applyEffectPositions = this.getApplyEffectPositions();

    return (() => {
      const result = [];
      for (var position of Array.from<any>(applyEffectPositions)) {
        var unit = board.getUnitAtPosition(position);
        if ((unit != null) && (unit.getOwnerId() !== this.getOwnerId())) {
          result.push(this.getGameSession().applyModifierContextObject(ModifierSilence.createContextObject(), unit));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
}
SpellSilenceAndSpawnEntityNearby.prototype.targetType = CardType.Unit;

module.exports = SpellSilenceAndSpawnEntityNearby;
