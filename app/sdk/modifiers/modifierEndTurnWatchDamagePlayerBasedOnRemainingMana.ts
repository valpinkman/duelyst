/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const ModifierEndEveryTurnWatch = require('./modifierEndEveryTurnWatch');

class ModifierEndTurnWatchDamagePlayerBasedOnRemainingMana extends ModifierEndEveryTurnWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierEndTurnWatchDamagePlayerBasedOnRemainingMana';
  static modifierName = 'End Watch';
  static description =
    'At the end of each turn, deal damage to the player equal to their remaining mana';

  static createContextObject(options) {
    const contextObject = super.createContextObject(options);
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description;
    }
  }

  onTurnWatch(action) {
    // get remaining mana
    const owner = action.getOwner();
    const damageAmount = owner.getRemainingMana();

    const target = this.getGameSession().getGeneralForPlayer(owner);

    // damage self
    const damageAction = new DamageAction(this.getGameSession());
    damageAction.setOwnerId(this.getCard().getOwnerId());
    damageAction.setSource(this.getCard());
    damageAction.setTarget(target);
    damageAction.setDamageAmount(damageAmount);
    return this.getGameSession().executeAction(damageAction);
  }
}
ModifierEndTurnWatchDamagePlayerBasedOnRemainingMana.prototype.type =
  'ModifierEndTurnWatchDamagePlayerBasedOnRemainingMana';
ModifierEndTurnWatchDamagePlayerBasedOnRemainingMana.prototype.fxResource = [
  'FX.Modifiers.ModifierEndTurnWatch',
  'FX.Modifiers.ModifierExplosionsNearby',
];

module.exports = ModifierEndTurnWatchDamagePlayerBasedOnRemainingMana;
