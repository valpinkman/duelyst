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
const RaceFactory = require('@duelyst/sdk/cards/raceFactory');
const ModifierSpellWatch = require('./modifierSpellWatch');
const Modifier = require('./modifier');

class ModifierSpellWatchBuffAlliesByRace extends ModifierSpellWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierSpellWatchBuffAlliesByRace';
  static modifierName = 'Spell Watch (Buff allies by race)';
  static description = 'Whenever you cast a spell, your';

  static createContextObject(attackBuff, maxHPBuff, validRace, options) {
    if (attackBuff == null) {
      attackBuff = 0;
    }
    if (maxHPBuff == null) {
      maxHPBuff = 0;
    }
    if (validRace == null) {
      validRace = 0;
    }
    const contextObject = super.createContextObject(options);
    contextObject.atkBuffVal = attackBuff;
    contextObject.maxHPBuffVal = maxHPBuff;
    contextObject.validRaceId = validRace;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      const replaceText = `${this.description} ${RaceFactory.raceForIdentifier(modifierContextObject.validRaceId).name} minions gain %X`;
      return replaceText.replace(
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
    // buff self (he's always an arcanyst)
    let statContextObject = Modifier.createContextObjectWithAttributeBuffs(
      this.atkBuffVal,
      this.maxHPBuffVal,
    );
    if (this.appliedName) {
      statContextObject.appliedName = this.appliedName;
    }
    this.getGameSession().applyModifierContextObject(statContextObject, this.getCard());

    // check for allied arcanysts, and buff them too
    const friendlyEntities = this.getGameSession()
      .getBoard()
      .getFriendlyEntitiesForEntity(this.getCard());
    return (() => {
      const result = [];
      for (var entity of Array.from<any>(friendlyEntities)) {
        if (entity.getBelongsToTribe(this.validRaceId)) {
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
ModifierSpellWatchBuffAlliesByRace.prototype.type = 'ModifierSpellWatchBuffAlliesByRace';
ModifierSpellWatchBuffAlliesByRace.prototype.fxResource = [
  'FX.Modifiers.ModifierSpellWatch',
  'FX.Modifiers.ModifierGenericBuff',
];

module.exports = ModifierSpellWatchBuffAlliesByRace;
