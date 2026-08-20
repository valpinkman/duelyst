/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const SpellDamage = require('./spellDamage');
const CardType = require('app/sdk/cards/cardType');
const AttackAction = require('app/sdk/actions/attackAction');

class SpellSpiralCounter extends SpellDamage {
  declare damageAmount: any;

  // can only target enemy minions that attacked last turn
  _filterPlayPositions(spellPositions) {
    const finalPositions = [];

    const turns = this.getGameSession().getTurns();
    if (turns.length > 1) {
      const lastTurn = turns[turns.length - 1];
      let actions = [];
      const possibleTargets = [];

      for (var step of Array.from<any>(lastTurn.getSteps())) {
        actions = actions.concat(step.getAction().getFlattenedActionTree());
      }

      // find enemy minions that attacked last turn
      for (var action of Array.from<any>(actions)) {
        if (action.type === AttackAction.type) {
          var attacker = action.getSource();
          if (
            attacker.getType() === CardType.Unit &&
            !(attacker.getOwnerId() === this.getOwnerId()) &&
            !attacker.getIsGeneral()
          ) {
            possibleTargets.push(attacker);
          }
        }
      }

      for (var target of Array.from<any>(possibleTargets)) {
        if (target.getIsLocatedOnBoard()) {
          finalPositions.push(target.getPosition());
        }
      }
    }

    return finalPositions;
  }
}
SpellSpiralCounter.prototype.damageAmount = 8;

module.exports = SpellSpiralCounter;
