/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierKillWatchSpawnEntity = require('./modifierKillWatchSpawnEntity');

class ModifierKillWatchSpawnEnemyEntity extends ModifierKillWatchSpawnEntity {
  static type = 'ModifierKillWatchSpawnEnemyEntity';

  getSpawnOwnerId(action) {
    return action.getTarget().getOwnerId();
  }
}
ModifierKillWatchSpawnEnemyEntity.prototype.type = 'ModifierKillWatchSpawnEnemyEntity';

module.exports = ModifierKillWatchSpawnEnemyEntity;
