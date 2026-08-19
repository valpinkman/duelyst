/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const SpellSpawnEntity = require('./spellSpawnEntity');
const CardType = require('app/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const Cards = require('app/sdk/cards/cardsLookupComplete');

class SpellShadows extends SpellSpawnEntity {
  declare cardDataOrIndexToSpawn: any;

  _findApplyEffectPositions(position, sourceAction) {
    const applyEffectPositions = [];
    const board = this.getGameSession().getBoard();

    // apply in front of each enemy unit and General
    let playerOffset = 0;
    if (this.isOwnedByPlayer1()) { playerOffset = 1; } else { playerOffset = -1; }
    const entity = this.getEntityToSpawn();
    for (var unit of Array.from<any>(board.getUnits())) {
      // look for units owned by the opponent of the player who cast the spell, and with an open space "behind" the enemy unit
      var behindPosition = { x: unit.getPosition().x + playerOffset, y: unit.getPosition().y };
      if ((unit.getOwnerId() !== this.getOwnerId()) && board.isOnBoard(behindPosition) && !board.getObstructionAtPositionForEntity(behindPosition, entity)) {
        applyEffectPositions.push(behindPosition);
      }
    }

    return applyEffectPositions;
  }

  getAppliesSameEffectToMultipleTargets() {
    return true;
  }
}
SpellShadows.prototype.cardDataOrIndexToSpawn = { id: Cards.Faction4.Wraithling };

module.exports = SpellShadows;
