/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const Modifier = require('./modifier');
const ModifierDeathWatch = require('./modifierDeathWatch');

class ModifierDeathWatchBuffRandomMinionInHand extends ModifierDeathWatch {
  declare type: any;
  declare fxResource: any;
  declare modifiersContextObjects: any;

  static type = 'ModifierDeathWatchBuffRandomMinionInHand';
  static description = 'Give a minion in your hand %X';

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

  onDeathWatch(action) {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const possibleMinions = [];
      for (var card of Array.from<any>(
        this.getCard().getOwner().getDeck().getCardsInHandExcludingMissing(),
      )) {
        if (card.getType() === CardType.Unit) {
          possibleMinions.push(card);
        }
      }
      if (possibleMinions.length > 0) {
        const cardToBuff =
          possibleMinions[
            this.getGameSession().getRandomIntegerForExecution(possibleMinions.length)
          ];
        return Array.from<any>(this.modifiersContextObjects).map((modifierContextObject) =>
          this.getGameSession().applyModifierContextObject(modifierContextObject, cardToBuff),
        );
      }
    }
  }
}
ModifierDeathWatchBuffRandomMinionInHand.prototype.type =
  'ModifierDeathWatchBuffRandomMinionInHand';
ModifierDeathWatchBuffRandomMinionInHand.prototype.fxResource = [
  'FX.Modifiers.ModifierDeathwatch',
  'FX.Modifiers.ModifierGenericBuff',
];
ModifierDeathWatchBuffRandomMinionInHand.prototype.modifiersContextObjects = null;

module.exports = ModifierDeathWatchBuffRandomMinionInHand;
