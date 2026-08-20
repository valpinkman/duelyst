/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Races = require('app/sdk/cards/racesLookup');
const ModifierSummonWatch = require('./modifierSummonWatch');

class ModifierSummonWatchHydrax extends ModifierSummonWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierSummonWatchHydrax';
  static modifierName = 'Modifier Summon Watch Hydrax';
  static description = 'Whenever you summon a Battle Pet, it and Hydrax gain %X';

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

  onSummonWatch(action) {
    if (this.modifiersContextObjects != null) {
      const entity = action.getTarget();
      if (entity != null) {
        // apply self buff
        this.getGameSession().applyModifierContextObject(
          this.modifiersContextObjects[0],
          this.getCard(),
        );
        // apply buff to battle pet being spawend
        return this.getGameSession().applyModifierContextObject(
          this.modifiersContextObjects[1],
          entity,
        );
      }
    }
  }

  getIsCardRelevantToWatcher(card) {
    return card.getBelongsToTribe(Races.BattlePet);
  }
}
ModifierSummonWatchHydrax.prototype.type = 'ModifierSummonWatchHydrax';
ModifierSummonWatchHydrax.prototype.fxResource = ['FX.Modifiers.ModifierSummonWatch'];

module.exports = ModifierSummonWatchHydrax;
