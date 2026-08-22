/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardFromHandAction = require('@duelyst/sdk/actions/playCardFromHandAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const i18next = require('i18next');
const ModifierAnySummonWatchFromActionBar = require('./modifierAnySummonWatchFromActionBar');

class ModifierAnySummonWatchFromActionBarApplyModifiersToSelf extends ModifierAnySummonWatchFromActionBar {
  declare type: any;
  declare fxResource: any;
  declare static description: any;

  static type = 'ModifierAnySummonWatchFromActionBarApplyModifiersToSelf';

  static createContextObject(modifiersContextObjects, buffDescription, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifiersContextObjects;
    contextObject.buffDescription = buffDescription;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return i18next.t('modifiers.any_summon_watch_from_action_bar_apply_modifiers_def', {
        desc: this.buffDescription,
      });
    }
    return this.description;
  }

  onSummonWatch(action?) {
    if (this.modifiersContextObjects != null) {
      return Array.from<any>(this.modifiersContextObjects).map((modifierContextObject) =>
        this.getGameSession().applyModifierContextObject(modifierContextObject, this.getCard()),
      );
    }
  }
}
ModifierAnySummonWatchFromActionBarApplyModifiersToSelf.prototype.type =
  'ModifierAnySummonWatchFromActionBarApplyModifiersToSelf';
ModifierAnySummonWatchFromActionBarApplyModifiersToSelf.description = i18next.t(
  'modifiers.any_summon_watch_from_action_bar_apply_modifiers_def',
);
ModifierAnySummonWatchFromActionBarApplyModifiersToSelf.prototype.fxResource = [
  'FX.Modifiers.ModifierSummonWatch',
  'FX.Modifiers.ModifierGenericBuff',
];

module.exports = ModifierAnySummonWatchFromActionBarApplyModifiersToSelf;
