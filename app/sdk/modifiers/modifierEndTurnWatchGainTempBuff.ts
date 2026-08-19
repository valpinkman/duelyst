/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierEndTurnWatch = require('./modifierEndTurnWatch');
const Modifier = require('./modifier');

class ModifierEndTurnWatchGainTempBuff extends ModifierEndTurnWatch {
  declare type: any;
  declare fxResource: any;
  declare attackBuff: any;
  declare healthBuff: any;
  declare modifierName: any;

  static type = 'ModifierEndTurnWatchGainTempBuff';
  static modifierName = 'End Turn Watch Temp Buff';
  static description = 'Gain a buff on your opponent\'s turn';

  onActivate() {
    super.onActivate();

    // when activated on opponent's turn, immediately activate buff for this turn
    if (!this.getCard().isOwnersTurn()) {
      const statContextObject = Modifier.createContextObjectWithAttributeBuffs(this.attackBuff, this.healthBuff);
      statContextObject.appliedName = this.modifierName;
      statContextObject.durationEndTurn = 1;
      return this.getGameSession().applyModifierContextObject(statContextObject, this.getCard());
    }
  }

  static createContextObject(attackBuff, healthBuff, modifierName, options) {
    if (attackBuff == null) { attackBuff = 0; }
    if (healthBuff == null) { healthBuff = 0; }
    const contextObject = super.createContextObject(options);
    contextObject.attackBuff = attackBuff;
    contextObject.healthBuff = healthBuff;
    contextObject.modifierName = modifierName;
    return contextObject;
  }

  onTurnWatch() {
    super.onTurnWatch();
    // at end of my turn, activate buff (so it will be active on opponent's turn)
    const statContextObject = Modifier.createContextObjectWithAttributeBuffs(this.attackBuff, this.healthBuff);
    statContextObject.appliedName = this.modifierName;
    statContextObject.durationEndTurn = 2;
    return this.getGameSession().applyModifierContextObject(statContextObject, this.getCard());
  }
}
ModifierEndTurnWatchGainTempBuff.prototype.type = 'ModifierEndTurnWatchGainTempBuff';
ModifierEndTurnWatchGainTempBuff.prototype.fxResource = ['FX.Modifiers.ModifierEndTurnWatch'];
ModifierEndTurnWatchGainTempBuff.prototype.attackBuff = 0;
ModifierEndTurnWatchGainTempBuff.prototype.healthBuff = 0;
ModifierEndTurnWatchGainTempBuff.prototype.modifierName = null;

module.exports = ModifierEndTurnWatchGainTempBuff;
