/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierMyAttackWatch = require('./modifierMyAttackWatch');

class ModifierMyAttackWatchApplyModifiersToAllies extends ModifierMyAttackWatch {
  static type = 'ModifierMyAttackWatchApplyModifiersToAllies';

  static createContextObject(modifiers, includeGeneral, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifierContextObjects = modifiers;
    contextObject.includeGeneral = includeGeneral;
    return contextObject;
  }

  onMyAttackWatch(action) {
    const friendlyEntities = this.getGameSession().getBoard().getFriendlyEntitiesForEntity(this.getCard());
    return (() => {
      const result = [];
      for (var entity of Array.from(friendlyEntities)) {
        if (!entity.getIsGeneral() || this.includeGeneral) {
          result.push(Array.from(this.modifierContextObjects).map((modifier) =>
            this.getGameSession().applyModifierContextObject(modifier, entity)));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
}
ModifierMyAttackWatchApplyModifiersToAllies.prototype.type = 'ModifierMyAttackWatchApplyModifiersToAllies';
ModifierMyAttackWatchApplyModifiersToAllies.prototype.modifierContextObjects = null;
ModifierMyAttackWatchApplyModifiersToAllies.prototype.includeGeneral = false;
ModifierMyAttackWatchApplyModifiersToAllies.prototype.fxResource = ['FX.Modifiers.ModifierGenericBuff'];

module.exports = ModifierMyAttackWatchApplyModifiersToAllies;
