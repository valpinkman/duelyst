/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const UtilsGameSession = require('app/common/utils/utils_game_session');
const Spell = require('./spell');
const CardType = require('app/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const _ = require('underscore');

class SpellApplyModifiersToGeneral extends Spell {
  _filterApplyPositions(validPositions) {
    const finalPositions = [];
    const ownGeneral = this.getGameSession().getGeneralForPlayerId(this.getOwnerId());
    const opponentGeneral = this.getGameSession().getGeneralForOpponentOfPlayerId(this.getOwnerId());
    if (this.applyToOwnGeneral) {
      finalPositions.push(ownGeneral.getPosition());
    }
    if (this.applyToOpponentGeneral) {
      finalPositions.push(opponentGeneral.getPosition());
    }

    return finalPositions;
  }

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    if (this.targetModifiersContextObjects != null) {
      let modifierContextObject;
      const ownerId = this.getOwnerId();
      const ownGeneral = this.getGameSession().getGeneralForPlayerId(ownerId);
      const opponentGeneral = this.getGameSession().getGeneralForOpponentOfPlayerId(ownerId);
      const target = board.getUnitAtPosition({ x, y });

      // check for apply on own General
      if (((target != null ? target.getOwnerId() : undefined) === ownerId) && this.applyToOwnGeneral) {
        for (modifierContextObject of Array.from(this.targetModifiersContextObjects)) {
          this.getGameSession().applyModifierContextObject(modifierContextObject, target);
        }
      }

      // check for apply on opponent General
      if (((target != null ? target.getOwnerId() : undefined) !== ownerId) && this.applyToOpponentGeneral) {
        return (() => {
          const result = [];
          for (modifierContextObject of Array.from(this.targetModifiersContextObjects)) {
            result.push(this.getGameSession().applyModifierContextObject(modifierContextObject, target));
          }
          return result;
        })();
      }
    }
  }
}
SpellApplyModifiersToGeneral.prototype.targetType = CardType.Unit;
SpellApplyModifiersToGeneral.prototype.spellFilterType = SpellFilterType.NeutralDirect;
SpellApplyModifiersToGeneral.prototype.applyToOwnGeneral = false;
SpellApplyModifiersToGeneral.prototype.applyToOpponentGeneral = false;

module.exports = SpellApplyModifiersToGeneral;
