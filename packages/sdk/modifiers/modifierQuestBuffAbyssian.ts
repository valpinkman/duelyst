/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierOnDyingResummonAnywhere = require('./modifierOnDyingResummonAnywhere');

class ModifierQuestBuffAbyssian extends ModifierOnDyingResummonAnywhere {
  declare type: any;
  declare maxStacks: any;

  static type = 'ModifierQuestBuffAbyssian';
}
ModifierQuestBuffAbyssian.prototype.type = 'ModifierQuestBuffAbyssian';
ModifierQuestBuffAbyssian.prototype.maxStacks = 1;

module.exports = ModifierQuestBuffAbyssian;
