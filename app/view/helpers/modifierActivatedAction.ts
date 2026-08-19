/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierAction = require('./modifierAction');

/*
  Action used for modifier activation.
*/
class ModifierActivatedAction extends ModifierAction {
  declare type: any;

  static type = 'ModifierActivatedAction';
}
ModifierActivatedAction.prototype.type = 'ModifierActivatedAction';

module.exports = ModifierActivatedAction;
