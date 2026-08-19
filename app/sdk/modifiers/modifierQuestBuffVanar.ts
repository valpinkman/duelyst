/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Modifier = require('./modifier');

class ModifierQuestBuffVanar extends Modifier {
  declare type: any;
  declare maxStacks: any;

  static type = 'ModifierQuestBuffVanar';
}
ModifierQuestBuffVanar.prototype.type = 'ModifierQuestBuffVanar';
ModifierQuestBuffVanar.prototype.maxStacks = 1;

module.exports = ModifierQuestBuffVanar;
