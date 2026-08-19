/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const SpellSpawnEntity = require('./spellSpawnEntity');

class SpellSpawnEntitiesOnEdgeSpaces extends SpellSpawnEntity {
  declare cardDataOrIndexToSpawn: any;

  _findApplyEffectPositions(position, sourceAction) {
    let i;
    const applyEffectPositions = [];

    for (i = 0; i <= 8; i++) {
      applyEffectPositions.push({ x: i, y: 0 });
      applyEffectPositions.push({ x: i, y: 4 });
    }

    for (i = 1; i <= 3; i++) {
      applyEffectPositions.push({ x: 0, y: i });
      applyEffectPositions.push({ x: 8, y: i });
    }

    return applyEffectPositions;
  }

  getAppliesSameEffectToMultipleTargets() {
    return true;
  }
}
SpellSpawnEntitiesOnEdgeSpaces.prototype.cardDataOrIndexToSpawn = null;

module.exports = SpellSpawnEntitiesOnEdgeSpaces;
