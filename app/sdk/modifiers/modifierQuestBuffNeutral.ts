/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Modifier = require('./modifier');

class ModifierQuestBuffNeutral extends Modifier {
  declare type: any;
  declare maxStacks: any;

  static type = 'ModifierQuestBuffNeutral';
}
ModifierQuestBuffNeutral.prototype.type = 'ModifierQuestBuffNeutral';
ModifierQuestBuffNeutral.prototype.maxStacks = 1;

module.exports = ModifierQuestBuffNeutral;
