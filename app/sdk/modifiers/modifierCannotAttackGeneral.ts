/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const AttackAction = require('app/sdk/actions/attackAction');
const i18next = require('i18next');
const ModifierCannot = require('./modifierCannot');

class ModifierCannotAttackGeneral extends ModifierCannot {
  declare type: any;
  declare fxResource: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierCannotAttackGeneral';

  onValidateAction(actionEvent) {
    const a = actionEvent.action;

    // minion cannot actively attack General, but it can strike back, frenzy, etc
    if (a instanceof AttackAction && a.getIsValid() && !a.getIsImplicit() && (this.getCard() === a.getSource()) && __guard__(a.getTarget(), (x) => x.getIsGeneral())) {
      return this.invalidateAction(a, this.getCard().getPosition(), i18next.t('modifiers.cannot_attack_general_error'));
    }
  }
}
ModifierCannotAttackGeneral.prototype.type = 'ModifierCannotAttackGeneral';
ModifierCannotAttackGeneral.modifierName = i18next.t('modifiers.cannot_attack_general_name');
ModifierCannotAttackGeneral.description = i18next.t('modifiers.cannot_attack_general_def');
ModifierCannotAttackGeneral.prototype.fxResource = ['FX.Modifiers.ModifierCannotAttackGeneral'];

module.exports = ModifierCannotAttackGeneral;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
