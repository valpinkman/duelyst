/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const ModifierDeathWatch = require('./modifierDeathWatch');

class ModifierDeathWatchBuffMinionsInHand extends ModifierDeathWatch {
  declare type: any;
  declare fxResource: any;
  declare modifiersContextObjects: any;

  static type = 'ModifierDeathWatchBuffMinionsInHand';

  static createContextObject(modifiersContextObjects, description, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifiersContextObjects;
    contextObject.description = description;
    return contextObject;
  }

  onDeathWatch(action) {
    const cardsInHand = this.getCard().getOwner().getDeck().getCardsInHandExcludingMissing();
    if (cardsInHand != null) {
      return (() => {
        const result = [];
        for (var card of Array.from<any>(cardsInHand)) {
          if ((card != null ? card.getType() : undefined) === CardType.Unit) {
            result.push(
              Array.from<any>(this.modifiersContextObjects).map((modifierContextObject) =>
                this.getGameSession().applyModifierContextObject(modifierContextObject, card),
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
ModifierDeathWatchBuffMinionsInHand.prototype.type = 'ModifierDeathWatchBuffMinionsInHand';
ModifierDeathWatchBuffMinionsInHand.prototype.fxResource = [
  'FX.Modifiers.ModifierDeathwatch',
  'FX.Modifiers.ModifierGenericBuff',
];
ModifierDeathWatchBuffMinionsInHand.prototype.modifiersContextObjects = null;

module.exports = ModifierDeathWatchBuffMinionsInHand;
