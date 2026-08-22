/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const ModifierMyAttackOrCounterattackWatch = require('./modifierMyAttackOrCounterattackWatch');

class ModifierMyAttackOrCounterattackWatchApplyModifiersToFriendlyMinions extends ModifierMyAttackOrCounterattackWatch {
  declare type: any;
  declare modifierContextObjects: any;
  declare raceId: any;

  static type = 'ModifierMyAttackOrCounterattackWatchApplyModifiersToFriendlyMinions';

  static createContextObject(modifierContextObjects, raceId = null, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifierContextObjects = modifierContextObjects;
    contextObject.raceId = raceId;
    return contextObject;
  }

  onMyAttackOrCounterattackWatch(action) {
    if (this.modifierContextObjects != null) {
      const general = this.getCard()
        .getGameSession()
        .getGeneralForPlayerId(this.getCard().getOwnerId());
      const friendlyMinions = this.getGameSession()
        .getBoard()
        .getFriendlyEntitiesForEntity(general, CardType.Unit, true, false);
      return (() => {
        const result = [];
        for (var minion of Array.from<any>(friendlyMinions)) {
          if (this.raceId == null || minion.getBelongsToTribe(this.raceId)) {
            result.push(
              Array.from<any>(this.modifierContextObjects).map((modifierContextObject) =>
                this.getGameSession().applyModifierContextObject(modifierContextObject, minion),
              ),
            );
          } else {
            result.push(undefined);
          }
        }
        return result;
      })();
    }
  }
}
ModifierMyAttackOrCounterattackWatchApplyModifiersToFriendlyMinions.prototype.type =
  'ModifierMyAttackOrCounterattackWatchApplyModifiersToFriendlyMinions';
ModifierMyAttackOrCounterattackWatchApplyModifiersToFriendlyMinions.prototype.modifierContextObjects =
  null;
ModifierMyAttackOrCounterattackWatchApplyModifiersToFriendlyMinions.prototype.raceId = null;

module.exports = ModifierMyAttackOrCounterattackWatchApplyModifiersToFriendlyMinions;
