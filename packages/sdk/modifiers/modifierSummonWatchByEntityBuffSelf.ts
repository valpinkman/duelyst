/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Stringifiers = require('@duelyst/sdk/helpers/stringifiers');
const ModifierSummonWatch = require('./modifierSummonWatch');
const Modifier = require('./modifier');

class ModifierSummonWatchByEntityBuffSelf extends ModifierSummonWatch {
  declare type: any;
  declare cardName: any;
  declare fxResource: any;

  static type = 'ModifierSummonWatchByEntityBuffSelf';
  static modifierName = 'Summon Watch (buff by entity)';
  static description = 'Whenever you summon a %X, this gains %Y';

  static createContextObject(attackBuff, maxHPBuff, targetEntityId, cardName, options) {
    if (attackBuff == null) {
      attackBuff = 0;
    }
    if (maxHPBuff == null) {
      maxHPBuff = 0;
    }
    this.targetEntityId = targetEntityId;
    const contextObject = super.createContextObject(options);
    contextObject.targetEntityId = this.targetEntityId;
    contextObject.cardName = cardName;
    const statBuff = Modifier.createContextObjectWithAttributeBuffs(attackBuff, maxHPBuff);
    statBuff.appliedName = "Overseer's Growth";
    contextObject.modifiersContextObjects = [statBuff];

    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      const subContextObject = modifierContextObject.modifiersContextObjects[0];
      const replaceText = this.description.replace(
        /%Y/,
        Stringifiers.stringifyAttackHealthBuff(
          subContextObject.attributeBuffs.atk,
          subContextObject.attributeBuffs.maxHP,
        ),
      );
      return replaceText.replace(/%X/, modifierContextObject.cardName);
    }
    return this.description;
  }

  onSummonWatch(action?) {
    return this.applyManagedModifiersFromModifiersContextObjects(
      this.modifiersContextObjects,
      this.getCard(),
    );
  }

  getIsCardRelevantToWatcher(card) {
    return card.getBaseCardId() === this.targetEntityId;
  }
}
ModifierSummonWatchByEntityBuffSelf.prototype.type = 'ModifierSummonWatchByEntityBuffSelf';
ModifierSummonWatchByEntityBuffSelf.prototype.cardName = null;
ModifierSummonWatchByEntityBuffSelf.prototype.fxResource = [
  'FX.Modifiers.ModifierSummonWatch',
  'FX.Modifiers.ModifierGenericBuff',
];

module.exports = ModifierSummonWatchByEntityBuffSelf;
