/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierFrenzy = require('@duelyst/sdk/modifiers/modifierFrenzy');
const ModifierFlying = require('@duelyst/sdk/modifiers/modifierFlying');
const ModifierTranscendance = require('@duelyst/sdk/modifiers/modifierTranscendance');
const ModifierProvoke = require('@duelyst/sdk/modifiers/modifierProvoke');
const ModifierBlastAttack = require('@duelyst/sdk/modifiers/modifierBlastAttack');
const ModifierOpponentDrawCardWatch = require('./modifierOpponentDrawCardWatch');

var ModifierOpponentDrawCardWatchGainKeyword = (function () {
  let allModifierContextObjects;
  ModifierOpponentDrawCardWatchGainKeyword = class ModifierOpponentDrawCardWatchGainKeyword extends (
    ModifierOpponentDrawCardWatch
  ) {
    declare type: any;
    static initClass() {
      this.prototype.type = 'ModifierOpponentDrawCardWatchGainKeyword';
      this.type = 'ModifierOpponentDrawCardWatchGainKeyword';

      this.modifierName = 'ModifierOpponentDrawCardWatchGainKeyword';
      this.description = 'Whenever your opponent draws a card, this minion gains a random ability.';

      allModifierContextObjects = [];
    }

    static createContextObject() {
      const contextObject = super.createContextObject();
      contextObject.allModifierContextObjects = [
        ModifierFrenzy.createContextObject(),
        ModifierFlying.createContextObject(),
        ModifierTranscendance.createContextObject(),
        ModifierProvoke.createContextObject(),
        ModifierBlastAttack.createContextObject(),
      ];
      return contextObject;
    }

    onDrawCardWatch(action) {
      super.onDrawCardWatch(action);

      if (
        this.getGameSession().getIsRunningAsAuthoritative() &&
        this.allModifierContextObjects.length > 0
      ) {
        // pick one modifier from the remaining list and splice it out of the set of choices
        const modifierContextObject = this.allModifierContextObjects.splice(
          this.getGameSession().getRandomIntegerForExecution(this.allModifierContextObjects.length),
          1,
        )[0];
        return this.getGameSession().applyModifierContextObject(
          modifierContextObject,
          this.getCard(),
        );
      }
    }
  };
  ModifierOpponentDrawCardWatchGainKeyword.initClass();
  return ModifierOpponentDrawCardWatchGainKeyword;
})();

module.exports = ModifierOpponentDrawCardWatchGainKeyword;
