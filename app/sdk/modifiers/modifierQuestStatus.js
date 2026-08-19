/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Modifier = require('./modifier');

class ModifierQuestStatus extends Modifier {
  static type = 'ModifierQuestStatus';
}
ModifierQuestStatus.prototype.type = 'ModifierQuestStatus';
ModifierQuestStatus.prototype.maxStacks = 1;
ModifierQuestStatus.prototype.isRemovable = false;

module.exports = ModifierQuestStatus;
