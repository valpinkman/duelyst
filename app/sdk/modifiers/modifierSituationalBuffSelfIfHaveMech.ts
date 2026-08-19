/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Races = require('app/sdk/cards/racesLookup');
const CardType = require('app/sdk/cards/cardType');
const ModifierSituationalBuffSelf = require('./modifierSituationalBuffSelf');

class ModifierSituationalBuffSelfIfHaveMech extends ModifierSituationalBuffSelf {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;

  static type = 'ModifierSituationalBuffSelfIfHaveMech';

  static createContextObject(modifierContextObjects, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifierContextObjects;
    return contextObject;
  }

  getIsSituationActiveForCache() {
    const friendlyMinions = this.getGameSession().getBoard().getFriendlyEntitiesForEntity(this.getCard(), CardType.Unit, true, false);
    if (friendlyMinions != null) {
      for (var minion of Array.from<any>(friendlyMinions)) {
        if ((minion != null) && minion.getBelongsToTribe(Races.Mech)) {
          return true;
        }
      }
    }
    return false;
  }
}
ModifierSituationalBuffSelfIfHaveMech.prototype.type = 'ModifierSituationalBuffSelfIfHaveMech';
ModifierSituationalBuffSelfIfHaveMech.prototype.activeInHand = false;
ModifierSituationalBuffSelfIfHaveMech.prototype.activeInDeck = false;
ModifierSituationalBuffSelfIfHaveMech.prototype.activeInSignatureCards = false;
ModifierSituationalBuffSelfIfHaveMech.prototype.activeOnBoard = true;

module.exports = ModifierSituationalBuffSelfIfHaveMech;
