/*
 * Hand-converted (decaffeinate refused: the CoffeeScript constructor used
 * `this` before `super`, which JS forbids). The pre-super assignment only
 * mattered because Modifier's constructor copies an own `attributeBuffs`
 * down; assigning a fresh object after super() yields the same final state.
 */
const Modifier = require('./modifier');

class ModifierDoubleHealthStat extends Modifier {
  constructor(gameSession) {
    super(gameSession);
    this.attributeBuffs = {};
    this.attributeBuffs.maxHP = 0;
  }

  onApplyToCardBeforeSyncState() {
    super.onApplyToCardBeforeSyncState();
    this.attributeBuffs.maxHP = this.getCard().getHP();
  }
}
ModifierDoubleHealthStat.prototype.type = 'ModifierDoubleHealthStat';
ModifierDoubleHealthStat.type = 'ModifierDoubleHealthStat';
ModifierDoubleHealthStat.description = 'Doubled Health';
ModifierDoubleHealthStat.prototype.fxResource = ['FX.Modifiers.ModifierGenericBuff'];

module.exports = ModifierDoubleHealthStat;
