/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const Modifier = require('./modifier');
const ModifierGainAttackWatch = require('./modifierGainAttackWatch');

class ModifierGainAttackWatchBuffSelfBySameThisTurn extends ModifierGainAttackWatch {
  static type = 'ModifierGainAttackWatchBuffSelfBySameThisTurn';
  static modifierName = 'Gain Attack Watch';

  onGainAttackWatch(action) {
    const attackBuff = action.getModifier().attributeBuffs.atk;
    const modifierContextObject = Modifier.createContextObjectWithAttributeBuffs(attackBuff);
    modifierContextObject.appliedName = i18next.t('modifiers.gain_attack_watch_buff_self_by_same_this_turn_name');
    modifierContextObject.durationEndTurn = 1;
    return this.getGameSession().applyModifierContextObject(modifierContextObject, this.getCard(), this);
  }
}
ModifierGainAttackWatchBuffSelfBySameThisTurn.prototype.type = 'ModifierGainAttackWatchBuffSelfBySameThisTurn';
ModifierGainAttackWatchBuffSelfBySameThisTurn.description = i18next.t('modifiers.gain_attack_watch_buff_self_by_same_this_turn_def');
ModifierGainAttackWatchBuffSelfBySameThisTurn.prototype.fxResource = ['FX.Modifiers.ModifierDrawCardWatch', 'FX.Modifiers.ModifierGenericBuff'];

module.exports = ModifierGainAttackWatchBuffSelfBySameThisTurn;
