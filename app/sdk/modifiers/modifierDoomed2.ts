/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const ModifierEndTurnWatch = require('./modifierEndTurnWatch');
const ModifierDoomed = require('./modifierDoomed');

class ModifierDoomed2 extends ModifierEndTurnWatch {
  declare type: any;
  declare fxResource: any;
  declare isRemovable: any;
  declare maxStacks: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierDoomed2';

  onTurnWatch() {
    super.onTurnWatch();

    if (this.numEndTurnsElapsed > 1) { // don't apply and remove self in same turn!
      // apply next stage of Doom and remove self
      this.getGameSession().applyModifierContextObject(ModifierDoomed.createContextObject(), this.getCard());
      return this.getGameSession().removeModifier(this);
    }
  }
}
ModifierDoomed2.prototype.type = 'ModifierDoomed2';
ModifierDoomed2.modifierName = i18next.t('modifiers.doomed_name');
ModifierDoomed2.description = i18next.t('modifiers.doomed_2_def');
ModifierDoomed2.prototype.fxResource = ['FX.Modifiers.ModifierDoomed2'];
ModifierDoomed2.prototype.isRemovable = false;
ModifierDoomed2.prototype.maxStacks = 1;

module.exports = ModifierDoomed2;
