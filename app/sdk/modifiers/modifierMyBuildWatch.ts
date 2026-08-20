/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardAsTransformAction = require('app/sdk/actions/playCardAsTransformAction');
const ModifierBuilding = require('app/sdk/modifiers/modifierBuilding');
const ModifierBuildWatch = require('./modifierBuildWatch');

class ModifierMyBuildWatch extends ModifierBuildWatch {
  declare type: any;

  static type = 'ModifierMyBuildWatch';

  getIsActionRelevant(action) {
    return super.getIsActionRelevant(action) && action.getOwnerId() === this.getCard().getOwnerId();
  }
}
ModifierMyBuildWatch.prototype.type = 'ModifierMyBuildWatch';

module.exports = ModifierMyBuildWatch;
