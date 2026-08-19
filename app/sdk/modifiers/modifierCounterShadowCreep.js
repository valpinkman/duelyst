/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const StartTurnAction = require('app/sdk/actions/startTurnAction');
const i18next = require('i18next');
const ModifierCounter = require('./modifierCounter');
const ModifierCounterShadowCreepDescription = require('./modifierCounterShadowCreepDescription');

/*
  Counts total number of shadow creep tiles owned by this player
*/
class ModifierCounterShadowCreep extends ModifierCounter {
  static type = 'ModifierCounterShadowCreep';

  static createContextObject(modTypeToTrack) {
    const contextObject = super.createContextObject();
    contextObject.modTypeToTrack = modTypeToTrack;
    return contextObject;
  }

  getModifierContextObjectToApply() {
    const modContextObject = ModifierCounterShadowCreepDescription.createContextObject(this.getCurrentCount());
    modContextObject.appliedName = i18next.t('modifiers.shadowcreep_counter_applied_name');

    return modContextObject;
  }

  getCurrentCount() {
    const modifierStackingShadows = this.getGameSession().getModifierClassForType(this.modTypeToTrack);
    return modifierStackingShadows.getNumStacksForPlayer(this.getGameSession().getBoard(), this.getCard().getOwner());
  }
}
ModifierCounterShadowCreep.prototype.type = 'ModifierCounterShadowCreep';
ModifierCounterShadowCreep.prototype.maxStacks = 1;

module.exports = ModifierCounterShadowCreep;
