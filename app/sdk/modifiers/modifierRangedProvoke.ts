/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const Logger = require('app/common/logger');
const AttackAction = require('app/sdk/actions/attackAction');
const _ = require('underscore');
const i18next = require('i18next');
const Modifier = require('./modifier');
const ModifierRangedProvoked = require('./modifierRangedProvoked');
const ModifierRanged = require('./modifierRanged');

class ModifierRangedProvoke extends Modifier {
  declare type: any;
  declare maxStacks: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare isAura: any;
  declare auraRadius: any;
  declare auraIncludeSelf: any;
  declare auraIncludeAlly: any;
  declare auraIncludeEnemy: any;
  declare modifiersContextObjects: any;
  declare fxResource: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierRangedProvoke';

  onValidateAction(actionEvent) {
    const a = actionEvent.action;
    if (
      this.getCard() != null &&
      a instanceof AttackAction &&
      !a.getIsImplicit() &&
      a.getIsValid() &&
      !this.getCard().getIsSameTeamAs(a.getSource()) &&
      _.contains(this.getEntitiesInAura(), a.getSource()) &&
      !a.getTarget().hasModifierType(ModifierRangedProvoke.type)
    ) {
      // in the case of attacking melee provoker, don't invalidate
      if (
        !(
          a.getSource().getIsProvoked() &&
          _.contains(a.getTarget().getEntitiesProvoked(), a.getSource())
        )
      ) {
        return this.invalidateAction(
          a,
          this.getCard().getPosition(),
          'Provoked - must first attack the Provoker.',
        );
      }
    }
  }

  _filterPotentialCardInAura(card) {
    return card.hasActiveModifierClass(ModifierRanged) && super._filterPotentialCardInAura(card);
  }
}
ModifierRangedProvoke.prototype.type = 'ModifierRangedProvoke';
ModifierRangedProvoke.prototype.maxStacks = 1;
ModifierRangedProvoke.modifierName = i18next.t('modifiers.ranged_provoke_name');
ModifierRangedProvoke.description = i18next.t('modifiers.ranged_provoke_def');
ModifierRangedProvoke.prototype.activeInHand = false;
ModifierRangedProvoke.prototype.activeInDeck = false;
ModifierRangedProvoke.prototype.activeInSignatureCards = false;
ModifierRangedProvoke.prototype.activeOnBoard = true;
ModifierRangedProvoke.prototype.isAura = true;
ModifierRangedProvoke.prototype.auraRadius = CONFIG.WHOLE_BOARD_RADIUS;
ModifierRangedProvoke.prototype.auraIncludeSelf = false;
ModifierRangedProvoke.prototype.auraIncludeAlly = false;
ModifierRangedProvoke.prototype.auraIncludeEnemy = true;
ModifierRangedProvoke.prototype.modifiersContextObjects = [
  ModifierRangedProvoked.createContextObject(),
];
ModifierRangedProvoke.prototype.fxResource = ['FX.Modifiers.ModifierProvoke'];

module.exports = ModifierRangedProvoke;
