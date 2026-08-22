/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Cards = require('@duelyst/sdk/cards/cardsLookupComplete');
const ModifierSituationalBuffSelf = require('./modifierSituationalBuffSelf');
const Modifier = require('./modifier');

class ModifierSituationalBuffSelfIfSpriggin extends ModifierSituationalBuffSelf {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;

  static type = 'ModifierSituationalBuffSelfIfSpriggin';
  static modifierName = 'ModifierSituationalBuffSelfIfSpriggin';
  static description = 'If there is a Spriggin gain +3 Attack';

  static createContextObject(options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = [
      Modifier.createContextObjectWithAttributeBuffs(3, 0, {
        modifierName: 'Spriggin Buff',
        appliedName: 'Might of Spriggin',
        description: 'If there is a Spriggin gain +3 Attack',
      }),
    ];
    return contextObject;
  }

  getIsSituationActiveForCache() {
    for (var unit of Array.from<any>(this.getGameSession().getBoard().getUnits())) {
      if ((unit != null ? unit.getBaseCardId() : undefined) === Cards.Neutral.Spriggin) {
        return true;
      }
    }
    return false;
  }
}
ModifierSituationalBuffSelfIfSpriggin.prototype.type = 'ModifierSituationalBuffSelfIfSpriggin';
ModifierSituationalBuffSelfIfSpriggin.prototype.activeInHand = false;
ModifierSituationalBuffSelfIfSpriggin.prototype.activeInDeck = false;
ModifierSituationalBuffSelfIfSpriggin.prototype.activeInSignatureCards = false;
ModifierSituationalBuffSelfIfSpriggin.prototype.activeOnBoard = true;

module.exports = ModifierSituationalBuffSelfIfSpriggin;
