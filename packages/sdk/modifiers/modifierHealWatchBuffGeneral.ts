/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const Modifier = require('./modifier');
const ModifierHealWatch = require('./modifierHealWatch');

class ModifierHealWatchBuffGeneral extends ModifierHealWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierHealWatchBuffGeneral';
  static modifierName = 'Heal Watch';
  static description = 'Whenever anything is healed, give your General %X';

  static createContextObject(modifiersContextObjects, description, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifiersContextObjects;
    contextObject.description = description;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/, modifierContextObject.description);
    }
    return this.description;
  }

  onHealWatch(action) {
    const general = this.getGameSession().getGeneralForPlayer(this.getCard().getOwner());
    return Array.from<any>(this.modifiersContextObjects).map((modifierContextObject) =>
      this.getGameSession().applyModifierContextObject(modifierContextObject, general),
    );
  }
}
ModifierHealWatchBuffGeneral.prototype.type = 'ModifierHealWatchBuffGeneral';
ModifierHealWatchBuffGeneral.prototype.fxResource = [
  'FX.Modifiers.ModifierHealWatch',
  'FX.Modifiers.ModifierGenericBuff',
];

module.exports = ModifierHealWatchBuffGeneral;
