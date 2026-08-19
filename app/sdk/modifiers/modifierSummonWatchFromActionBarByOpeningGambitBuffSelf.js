/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardFromHandAction = require('app/sdk/actions/playCardFromHandAction');
const Stringifiers = require('app/sdk/helpers/stringifiers');
const Modifier = require('./modifier');
const ModifierSummonWatch = require('./modifierSummonWatch');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierSummonWatchFromActionBarByOpeningGambitBuffSelf extends ModifierSummonWatch {
  static type = 'ModifierSummonWatchFromActionBarByOpeningGambitBuffSelf';
  static modifierName = 'Summon Watch from action bar (buff by Opening Gambit)';
  static description = 'Whenever you summon a minion with Opening Gambit from your action bar, gain %Y';

  static createContextObject(attackBuff, maxHPBuff, options) {
    if (attackBuff == null) { attackBuff = 0; }
    if (maxHPBuff == null) { maxHPBuff = 0; }
    if (options == null) { options = undefined; }
    const contextObject = super.createContextObject(options);
    const modContextObject = Modifier.createContextObjectWithAttributeBuffs(attackBuff, maxHPBuff);
    modContextObject.appliedName = 'Hunter';
    contextObject.modifiersContextObjects = [modContextObject];
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      const subContextObject = modifierContextObject.modifiersContextObjects[0];
      return this.description.replace(/%Y/, Stringifiers.stringifyAttackHealthBuff(subContextObject.attributeBuffs.atk, subContextObject.attributeBuffs.maxHP));
    }
    return this.description;
  }

  getIsActionRelevant(action) {
    // watch for a unit being summoned from action bar by the player who owns this entity, don't trigger on summon of this unit
    return action instanceof PlayCardFromHandAction && (action.getCard() !== this.getCard()) && super.getIsActionRelevant(action);
  }

  onSummonWatch(action) {
    // apply modifiers once
    return this.applyManagedModifiersFromModifiersContextObjects(this.modifiersContextObjects, this.getCard());
  }

  getIsCardRelevantToWatcher(card) {
    // search for keyword class opening gambit
    // searching by keyword class because units with followup spells on summon are also 'opening gambit' minions
    for (var kwClass of Array.from(card.getKeywordClasses())) {
      if (kwClass.belongsToKeywordClass(ModifierOpeningGambit)) {
        return true;
      }
    }
    return false;
  }
}
ModifierSummonWatchFromActionBarByOpeningGambitBuffSelf.prototype.type = 'ModifierSummonWatchFromActionBarByOpeningGambitBuffSelf';
ModifierSummonWatchFromActionBarByOpeningGambitBuffSelf.prototype.fxResource = ['FX.Modifiers.ModifierSummonWatch', 'FX.Modifiers.ModifierGenericBuff'];
// fallback to false if no opening gambit keywords found

module.exports = ModifierSummonWatchFromActionBarByOpeningGambitBuffSelf;
