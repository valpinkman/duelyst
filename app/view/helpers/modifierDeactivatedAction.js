/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierAction = require('./modifierAction');

/*
  Action used for modifier deactivation.
*/
class ModifierDeactivatedAction extends ModifierAction {
  static type = 'ModifierDeactivatedAction';
}
ModifierDeactivatedAction.prototype.type = 'ModifierDeactivatedAction';

module.exports = ModifierDeactivatedAction;
