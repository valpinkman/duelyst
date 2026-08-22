/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierDealDamageWatch = require('./modifierDealDamageWatch');

class ModifierDealDamageWatchApplyModifiersToAllies extends ModifierDealDamageWatch {
  declare type: any;
  declare modifierContextObjects: any;
  declare includeGeneral: any;

  static type = 'ModifierDealDamageWatchApplyModifiersToAllies';

  static createContextObject(modifiers, includeGeneral, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifierContextObjects = modifiers;
    contextObject.includeGeneral = includeGeneral;
    return contextObject;
  }

  onAfterDealDamage(action) {
    // apply to self if not a General
    let modifier;
    if (!this.getCard().getIsGeneral()) {
      for (modifier of Array.from<any>(this.modifierContextObjects)) {
        this.getGameSession().applyModifierContextObject(modifier, this.getCard());
      }
    }

    // apply to friendly minions and General
    const friendlyEntities = this.getGameSession()
      .getBoard()
      .getFriendlyEntitiesForEntity(this.getCard());
    return (() => {
      const result = [];
      for (var entity of Array.from<any>(friendlyEntities)) {
        if (!entity.getIsGeneral() || this.includeGeneral) {
          result.push(
            (() => {
              const result1 = [];
              for (modifier of Array.from<any>(this.modifierContextObjects)) {
                result1.push(this.getGameSession().applyModifierContextObject(modifier, entity));
              }
              return result1;
            })(),
          );
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
}
ModifierDealDamageWatchApplyModifiersToAllies.prototype.type =
  'ModifierDealDamageWatchApplyModifiersToAllies';
ModifierDealDamageWatchApplyModifiersToAllies.prototype.modifierContextObjects = null;
ModifierDealDamageWatchApplyModifiersToAllies.prototype.includeGeneral = false;

module.exports = ModifierDealDamageWatchApplyModifiersToAllies;
