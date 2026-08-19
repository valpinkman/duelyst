/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const CONFIG = require('app/common/config');
const _ = require('underscore');
const ModifierAlwaysInfiltrated = require('app/sdk/modifiers/modifierAlwaysInfiltrated');
const ModifierProvidesAlwaysInfiltrated = require('app/sdk/modifiers/modifierProvidesAlwaysInfiltrated');

const i18next = require('i18next');
const ModifierSituationalBuffSelf = require('./modifierSituationalBuffSelf');

class ModifierInfiltrate extends ModifierSituationalBuffSelf {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;
  declare static modifierName: any;
  declare static keywordDefinition: any;

  static type = 'ModifierInfiltrate';
  static isKeyworded = true;
  static description = 'Whenever this minion is on the enemy side of the battlefield..';

  static createContextObject(modifiersContextObjects, description, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifiersContextObjects;
    // NOTE: the original CoffeeScript iterated `for x of array` (keys, i.e.
    // strings) and assigned a property on the string - a silent no-op in
    // sloppy mode that throws in strict ES6 class methods. appliedName was
    // therefore never actually applied here; behavior preserved by omitting
    // the loop entirely.
    contextObject.description = description;
    return contextObject;
  }

  getIsSituationActiveForCache() {
    if (this.getCard().hasModifierType(ModifierAlwaysInfiltrated.type)) {
      return true;
    }
    for (var unit of Array.from<any>(this.getGameSession().getBoard().getFriendlyEntitiesForEntity(this.getCard()))) {
      if (unit.hasActiveModifierClass(ModifierProvidesAlwaysInfiltrated)) {
        return true;
      }
    }
    // infiltrate is active when this entity is on the enemy side of the battlefield (determined by player starting side)

    // begin with "my side" defined as whole board
    let enemySideStartX = 0;
    let enemySideEndX = CONFIG.BOARDCOL;

    if (this.getCard().isOwnedByPlayer1()) {
      enemySideStartX = Math.floor(((enemySideEndX - enemySideStartX) * 0.5) + 1);
    } else if (this.getCard().isOwnedByPlayer2()) {
      enemySideEndX = Math.floor(((enemySideEndX - enemySideStartX) * 0.5) - 1);
    }

    const {
      x,
    } = this.getCard().getPosition();
    return (x >= enemySideStartX) && (x <= enemySideEndX);
  }
}
ModifierInfiltrate.prototype.type = 'ModifierInfiltrate';
ModifierInfiltrate.modifierName = i18next.t('modifiers.infiltrate_name');
ModifierInfiltrate.keywordDefinition = i18next.t('modifiers.infiltrate_def');
ModifierInfiltrate.prototype.activeInHand = false;
ModifierInfiltrate.prototype.activeInDeck = false;
ModifierInfiltrate.prototype.activeInSignatureCards = false;
ModifierInfiltrate.prototype.activeOnBoard = true;
ModifierInfiltrate.prototype.fxResource = ['FX.Modifiers.ModifierInfiltrate'];

module.exports = ModifierInfiltrate;
