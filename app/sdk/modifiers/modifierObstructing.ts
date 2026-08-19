/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Modifier = require('./modifier');

class ModifierObstructing extends Modifier {
  declare type: any;
  declare maxStacks: any;

  static type = 'ModifierObstructing';
  static modifierName = 'Obstructing';
  static description = 'This entity is obstructing its location';
}
ModifierObstructing.prototype.type = 'ModifierObstructing';
ModifierObstructing.prototype.maxStacks = 1;

module.exports = ModifierObstructing;
