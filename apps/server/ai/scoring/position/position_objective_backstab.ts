const distanceBetweenBoardPositions = require('../utils/utils_distanceBetweenBoardPositions');
const BOUNTY = require('../bounty');
const _ = require('underscore');
const ModifierBackstab = require('@duelyst/sdk/modifiers/modifierBackstab');

const position_objective_backstab = function (gameSession, unit, position, bestObjective) {
  let score = 0;
  // backstabbers prefer to be nearer to their backstab space of their primary objective
  if (unit.hasModifierClass(ModifierBackstab)) {
    /// /Logger.module("AI").debug("[G:" + gameSession.gameId + "] scoreForUnit_module_backstab() => unit " + unit.getLogName() + ". score = " + score);
    const backstabSpace = _.find(gameSession.getBoard().getPositions(), (pos) =>
      gameSession.getBoard().getIsPositionBehindEntity(bestObjective, pos, 1, 0),
    );
    if (backstabSpace != null)
      score +=
        BOUNTY.DISTANCE_FROM_BACKSTAB * distanceBetweenBoardPositions(backstabSpace, position);
    /// /Logger.module("AI").debug("[G:" + gameSession.gameId + "] scoreForUnit_module_backstab() => unit " + unit.getLogName() + ". score = " + score);
  }

  return score;
};

module.exports = position_objective_backstab;
