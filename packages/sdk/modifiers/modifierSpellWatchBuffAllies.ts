/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardFromHandAction = require('@duelyst/sdk/actions/playCardFromHandAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const Stringifiers = require('@duelyst/sdk/helpers/stringifiers');
const ModifierSpellWatch = require('./modifierSpellWatch');
const Modifier = require('./modifier');

class ModifierSpellWatchBuffAllies extends ModifierSpellWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierSpellWatchBuffAllies';
  static modifierName = 'Spell Watch (Buff allies )';
  static description = 'Whenever you cast a spell, friendly minions gain %X.';

  static createContextObject(attackBuff, maxHPBuff, options) {
    if (attackBuff == null) {
      attackBuff = 0;
    }
    if (maxHPBuff == null) {
      maxHPBuff = 0;
    }
    const contextObject = super.createContextObject(options);
    contextObject.atkBuffVal = attackBuff;
    contextObject.maxHPBuffVal = maxHPBuff;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(
        /%X/,
        Stringifiers.stringifyAttackHealthBuff(
          modifierContextObject.atkBuffVal,
          modifierContextObject.maxHPBuffVal,
        ),
      );
    }
    return this.description;
  }

  onSpellWatch(action) {
    // buff self
    let statContextObject = Modifier.createContextObjectWithAttributeBuffs(
      this.atkBuffVal,
      this.maxHPBuffVal,
    );
    if (this.appliedName) {
      statContextObject.appliedName = this.appliedName;
    }
    this.getGameSession().applyModifierContextObject(statContextObject, this.getCard());

    // buff friendly minions
    const friendlyEntities = this.getGameSession()
      .getBoard()
      .getFriendlyEntitiesForEntity(this.getCard());
    return (() => {
      const result = [];
      for (var entity of Array.from<any>(friendlyEntities)) {
        if (!entity.getIsGeneral()) {
          statContextObject = Modifier.createContextObjectWithAttributeBuffs(
            this.atkBuffVal,
            this.maxHPBuffVal,
          );
          if (this.appliedName) {
            statContextObject.appliedName = this.appliedName;
          }
          result.push(this.getGameSession().applyModifierContextObject(statContextObject, entity));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
}
ModifierSpellWatchBuffAllies.prototype.type = 'ModifierSpellWatchBuffAllies';
ModifierSpellWatchBuffAllies.prototype.fxResource = [
  'FX.Modifiers.ModifierSpellWatch',
  'FX.Modifiers.ModifierGenericBuff',
];

module.exports = ModifierSpellWatchBuffAllies;
