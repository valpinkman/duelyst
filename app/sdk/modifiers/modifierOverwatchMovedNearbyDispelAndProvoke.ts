/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierOverwatchMovedNearby = require('./modifierOverwatchMovedNearby');
const ModifierSilence = require('./modifierSilence');
const ModifierProvoke = require('./modifierProvoke');

class ModifierOverwatchMovedNearbyDispelAndProvoke extends ModifierOverwatchMovedNearby {
  declare type: any;

  static type = 'ModifierOverwatchMovedNearbyDispelAndProvoke';

  onOverwatch(action) {
    // dispel enemy
    const source = action.getSource();
    this.getGameSession().applyModifierContextObject(ModifierSilence.createContextObject(), source);

    // give provoke to self
    return this.getGameSession().applyModifierContextObject(ModifierProvoke.createContextObject(), this.getCard());
  }
}
ModifierOverwatchMovedNearbyDispelAndProvoke.prototype.type = 'ModifierOverwatchMovedNearbyDispelAndProvoke';

module.exports = ModifierOverwatchMovedNearbyDispelAndProvoke;
