/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierAction = require('./modifierAction');

/*
  Action used for modifier removal.
*/
class ModifierTriggeredAction extends ModifierAction {
  declare type: any;

  static type = 'ModifierTriggeredAction';
}
ModifierTriggeredAction.prototype.type = 'ModifierTriggeredAction';

module.exports = ModifierTriggeredAction;
