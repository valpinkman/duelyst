/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const HealAction = require('app/sdk/actions/healAction');
const ModifierSummonWatch = require('./modifierSummonWatch');

class ModifierSummonWatchByRaceHealToFull extends ModifierSummonWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierSummonWatchByRaceHealToFull';
  static modifierName = 'Summon Watch (by race heal to full)';
  static description = 'Whenever you summon %X, restore this minion to full health';

  static createContextObject(targetRaceId, raceName, options) {
    const contextObject = super.createContextObject(options);
    contextObject.targetRaceId = targetRaceId;
    contextObject.raceName = raceName;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/, modifierContextObject.raceName);
    }
    return this.description;
  }

  onSummonWatch(action?) {
    const healAction = this.getCard().getGameSession().createActionForType(HealAction.type);
    healAction.setTarget(this.getCard());
    healAction.setHealAmount(this.getCard().getMaxHP() - this.getCard().getHP());
    return this.getCard().getGameSession().executeAction(healAction);
  }

  getIsCardRelevantToWatcher(card) {
    return card.getBelongsToTribe(this.targetRaceId);
  }
}
ModifierSummonWatchByRaceHealToFull.prototype.type = 'ModifierSummonWatchByRaceHealToFull';
ModifierSummonWatchByRaceHealToFull.prototype.fxResource = [
  'FX.Modifiers.ModifierSummonWatch',
  'FX.Modifiers.ModifierGenericHeal',
];

module.exports = ModifierSummonWatchByRaceHealToFull;
