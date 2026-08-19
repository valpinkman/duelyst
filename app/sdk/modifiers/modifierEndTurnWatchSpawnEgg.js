/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsJavascript = require('app/common/utils/utils_javascript');
const Cards = require('app/sdk/cards/cardsLookupComplete');
const CardType = require('app/sdk/cards/cardType');
const ModifierEgg = require('app/sdk/modifiers/modifierEgg');
const _ = require('underscore');
const ModifierEndTurnWatchSpawnEntity = require('./modifierEndTurnWatchSpawnEntity');

class ModifierEndTurnWatchSpawnEgg extends ModifierEndTurnWatchSpawnEntity {
  static type = 'ModifierEndTurnWatchSpawnEgg';
  static modifierName = 'ModifierEndTurnWatchSpawnEgg';
  static description = 'At the end of your turn, summon %X nearby';

  static createContextObject(eggDescription, options) {
    let spawnCount; let spawnDescription; let spawnPattern; let
      spawnSilently;
    const contextObject = super.createContextObject({ id: Cards.Faction5.Egg }, (spawnDescription = ''), (spawnCount = 1), (spawnPattern = CONFIG.PATTERN_3x3), (spawnSilently = true), options);
    contextObject.eggDescription = eggDescription;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/, modifierContextObject.eggDescription);
    }
    return this.description;
  }

  getCardDataOrIndexToSpawn() {
    let cardDataOrIndexToSpawn = super.getCardDataOrIndexToSpawn();
    if (cardDataOrIndexToSpawn != null) {
      // add modifiers to data
      if (_.isObject(cardDataOrIndexToSpawn)) {
        cardDataOrIndexToSpawn = UtilsJavascript.fastExtend({}, cardDataOrIndexToSpawn);
      } else {
        cardDataOrIndexToSpawn = this.getGameSession().getCardByIndex(cardDataOrIndexToSpawn).createNewCardData();
      }

      if (cardDataOrIndexToSpawn.additionalInherentModifiersContextObjects == null) { cardDataOrIndexToSpawn.additionalInherentModifiersContextObjects = []; }
      cardDataOrIndexToSpawn.additionalInherentModifiersContextObjects.push(ModifierEgg.createContextObject(this.getCard().createNewCardData(), this.getCard().getName()));
    }
    return cardDataOrIndexToSpawn;
  }
}
ModifierEndTurnWatchSpawnEgg.prototype.type = 'ModifierEndTurnWatchSpawnEgg';
ModifierEndTurnWatchSpawnEgg.prototype.fxResource = ['FX.Modifiers.ModifierStartTurnWatch', 'FX.Modifiers.ModifierGenericSpawn'];

module.exports = ModifierEndTurnWatchSpawnEgg;
