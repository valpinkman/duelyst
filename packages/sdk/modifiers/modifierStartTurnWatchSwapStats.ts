/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('@duelyst/common/config');
const ModifierStartTurnWatch = require('./modifierStartTurnWatch');
const Modifier = require('./modifier');

class ModifierStartTurnWatchSwapStats extends ModifierStartTurnWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierStartTurnWatchSwapStats';
  static description =
    'At the start of your turn, fully heal this minion and switch its Attack and Health';

  onTurnWatch(action) {
    super.onTurnWatch();

    // reset damage dealt to this minion before swapping
    this.getCard().resetDamage();

    // get current attack and health values WITHOUT aura contributions
    const oldAttack = this.getCard().getATK(false);
    const oldHealth = this.getCard().getHP(false);

    // apply a hidden modifier that swaps current attack and health
    const contextObject = Modifier.createContextObjectWithAttributeBuffs();
    // set the attribute buffs manually in case either one is 0
    contextObject.attributeBuffs.atk = oldHealth;
    contextObject.attributeBuffs.maxHP = oldAttack;
    contextObject.attributeBuffsAbsolute = ['atk', 'maxHP'];

    contextObject.isHiddenToUI = true;
    return this.getCard()
      .getGameSession()
      .applyModifierContextObject(contextObject, this.getCard());
  }
}
ModifierStartTurnWatchSwapStats.prototype.type = 'ModifierStartTurnWatchSwapStats';
ModifierStartTurnWatchSwapStats.prototype.fxResource = ['FX.Modifiers.ModifierStartTurnWatch'];

module.exports = ModifierStartTurnWatchSwapStats;
