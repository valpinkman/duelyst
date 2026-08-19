/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierOnSummonFromHand = require('./modifierOnSummonFromHand');

class ModifierOnSummonFromHandApplyEmblems extends ModifierOnSummonFromHand {
  declare type: any;
  declare emblems: any;
  declare applyToSelf: any;
  declare applyToEnemy: any;

  static type = 'ModifierOnSummonFromHandApplyEmblems';
  static isKeyworded = true;
  static modifierName = 'Destiny';
  static description = null;
  static keywordDefinition = 'Summon to gain a permanent game-changing effect.';

  static createContextObject(emblems, applyToSelf, applyToEnemy, options) {
    if (applyToSelf == null) { applyToSelf = true; }
    if (applyToEnemy == null) { applyToEnemy = false; }
    const contextObject = super.createContextObject(options);
    contextObject.emblems = emblems;
    contextObject.applyToSelf = applyToSelf;
    contextObject.applyToEnemy = applyToEnemy;
    return contextObject;
  }

  onSummonFromHand() {
    if (this.emblems != null) {
      const general = this.getCard().getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId());
      const enemyGeneral = this.getCard().getGameSession().getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId());
      return (() => {
        const result = [];
        for (var emblem of Array.from<any>(this.emblems)) {
          emblem.isRemovable = false;
          if (emblem != null) {
            if (this.applyToSelf) {
              this.getGameSession().applyModifierContextObject(emblem, general);
            }
            if (this.applyToEnemy) {
              result.push(this.getGameSession().applyModifierContextObject(emblem, enemyGeneral));
            } else {
              result.push(undefined);
            }
          } else {
            result.push(undefined);
          }
        }
        return result;
      })();
    }
  }
}
ModifierOnSummonFromHandApplyEmblems.prototype.type = 'ModifierOnSummonFromHandApplyEmblems';
ModifierOnSummonFromHandApplyEmblems.prototype.emblems = null;
ModifierOnSummonFromHandApplyEmblems.prototype.applyToSelf = true;
ModifierOnSummonFromHandApplyEmblems.prototype.applyToEnemy = false;

module.exports = ModifierOnSummonFromHandApplyEmblems;
