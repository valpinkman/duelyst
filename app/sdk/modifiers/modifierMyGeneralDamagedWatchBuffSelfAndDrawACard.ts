/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const Modifier = require('./modifier');
const ModifierMyGeneralDamagedWatch = require('./modifierMyGeneralDamagedWatch');

class ModifierMyGeneralDamagedWatchBuffSelfAndDrawACard extends ModifierMyGeneralDamagedWatch {
  declare type: any;

  static type = 'ModifierMyGeneralDamagedWatchBuffSelfAndDrawACard';
  static modifierName = 'My General Damaged Watch';
  static description = 'Whenever your General takes damage, give this minion %X and draw a card';

  static createContextObject(statContextObject, description, options) {
    const contextObject = super.createContextObject(options);
    contextObject.description = description;
    contextObject.modifiersContextObjects = statContextObject;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/, modifierContextObject.description);
    }
    return this.description;
  }

  onDamageDealtToGeneral(action) {
    this.applyManagedModifiersFromModifiersContextObjects(this.modifiersContextObjects, this.getCard());
    return this.getGameSession().executeAction(this.getCard().getOwner().getDeck().actionDrawCard());
  }
}
ModifierMyGeneralDamagedWatchBuffSelfAndDrawACard.prototype.type = 'ModifierMyGeneralDamagedWatchBuffSelfAndDrawACard';

module.exports = ModifierMyGeneralDamagedWatchBuffSelfAndDrawACard;
