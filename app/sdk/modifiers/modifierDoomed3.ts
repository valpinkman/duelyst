/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const ModifierEndTurnWatch = require('./modifierEndTurnWatch');
const ModifierDoomed2 = require('./modifierDoomed2');

class ModifierDoomed3 extends ModifierEndTurnWatch {
  declare type: any;
  declare fxResource: any;
  declare isRemovable: any;
  declare maxStacks: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierDoomed3';

  onTurnWatch() {
    super.onTurnWatch();

    // apply next stage of Doom and remove self
    this.getGameSession().applyModifierContextObject(
      ModifierDoomed2.createContextObject(),
      this.getCard(),
    );
    return this.getGameSession().removeModifier(this);
  }
}
ModifierDoomed3.prototype.type = 'ModifierDoomed3';
ModifierDoomed3.modifierName = i18next.t('modifiers.doomed_name');
ModifierDoomed3.description = i18next.t('modifiers.doomed_3_def');
ModifierDoomed3.prototype.fxResource = ['FX.Modifiers.ModifierDoomed3'];
ModifierDoomed3.prototype.isRemovable = false;
ModifierDoomed3.prototype.maxStacks = 1;

module.exports = ModifierDoomed3;
