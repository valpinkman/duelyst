/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ApplyCardToBoardAction = require('app/sdk/actions/applyCardToBoardAction');
const CardType = require('app/sdk/cards/cardType');
const Modifier = require('./modifier');
const ModifierEgg = require('./modifierEgg');

class ModifierSummonWatchFromEggApplyModifiers extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierSummonWatchFromEggApplyModifiers';
  static modifierName = 'Summon Watch';
  static description = 'Friendly minions that hatch from Eggs %X';

  static createContextObject(modifiersContextObjects, buffDescription, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifiersContextObjects;
    contextObject.buffDescription = buffDescription;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/, modifierContextObject.buffDescription);
    }
    return this.description;
  }

  onAction(e) {
    super.onAction(e);

    const { action } = e;

    // watch for a unit being summoned from an egg by the player who owns this entity
    if (
      action instanceof ApplyCardToBoardAction &&
      action.getOwnerId() === this.getCard().getOwnerId() &&
      __guard__(action.getCard(), (x) => x.type) === CardType.Unit &&
      action.getCard() !== this.getCard()
    ) {
      if (action.getTriggeringModifier() instanceof ModifierEgg) {
        const entity = action.getTarget();
        if (entity != null) {
          return Array.from<any>(this.modifiersContextObjects).map((modifierContextObject) =>
            this.getGameSession().applyModifierContextObject(modifierContextObject, entity),
          );
        }
      }
    }
  }
}
ModifierSummonWatchFromEggApplyModifiers.prototype.type =
  'ModifierSummonWatchFromEggApplyModifiers';
ModifierSummonWatchFromEggApplyModifiers.prototype.activeInHand = false;
ModifierSummonWatchFromEggApplyModifiers.prototype.activeInDeck = false;
ModifierSummonWatchFromEggApplyModifiers.prototype.activeInSignatureCards = false;
ModifierSummonWatchFromEggApplyModifiers.prototype.activeOnBoard = true;
ModifierSummonWatchFromEggApplyModifiers.prototype.fxResource = [
  'FX.Modifiers.ModifierSummonWatch',
];

module.exports = ModifierSummonWatchFromEggApplyModifiers;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
