/*
 * Hand-converted (decaffeinate refused: the CoffeeScript constructor used
 * `this` before `super`, which JS forbids). The pre-super assignment only
 * mattered because Modifier's constructor copies an own `attributeBuffs`
 * down; assigning a fresh object after super() yields the same final state.
 */
const Modifier = require('./modifier');

class ModifierDoubleAttackStat extends Modifier {
  declare type: any;
  declare fxResource: any;
  declare static type: any;
  declare static description: any;

  constructor(gameSession) {
    super(gameSession);
    this.attributeBuffs = {};
    this.attributeBuffs.atk = 0;
  }

  onApplyToCardBeforeSyncState() {
    super.onApplyToCardBeforeSyncState();
    this.attributeBuffs.atk = this.getCard().getATK();
  }
}
ModifierDoubleAttackStat.prototype.type = 'ModifierDoubleAttackStat';
ModifierDoubleAttackStat.type = 'ModifierDoubleAttackStat';
ModifierDoubleAttackStat.description = 'Doubled Attack';
ModifierDoubleAttackStat.prototype.fxResource = ['FX.Modifiers.ModifierGenericBuff'];

module.exports = ModifierDoubleAttackStat;
