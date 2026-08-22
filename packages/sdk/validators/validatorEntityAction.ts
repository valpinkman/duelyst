/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Validator = require('./validator');
const MoveAction = require('@duelyst/sdk/actions/moveAction');
const AttackAction = require('@duelyst/sdk/actions/attackAction');
const Entity = require('@duelyst/sdk/entities/entity');
const i18next = require('i18next');

class ValidatorEntityAction extends Validator {
  declare type: any;

  static type = 'ValidatorEntityAction';

  onValidateAction(event) {
    super.onValidateAction(event);
    const { action } = event;
    if (action != null && action.getIsValid() && !action.getIsImplicit()) {
      let source;
      let targetPosition;
      if (action.getType() === MoveAction.type) {
        source = action.getSource();
        targetPosition = action.getTargetPosition();
        if (!(source instanceof Entity)) {
          return this.invalidateAction(
            action,
            targetPosition,
            i18next.t('validators.not_a_valid_move_message'),
          );
        }
        if (!source.getCanMove()) {
          return this.invalidateAction(
            action,
            action.getSourcePosition(),
            i18next.t('validators.unit_cannot_move_message'),
          );
        }
        if (
          !source
            .getMovementRange()
            .getIsPositionValid(this.getGameSession().getBoard(), source, targetPosition)
        ) {
          return this.invalidateAction(
            action,
            targetPosition,
            i18next.t('validators.invalid_move_position_message'),
          );
        }
      } else if (action.getType() === AttackAction.type) {
        source = action.getSource();
        targetPosition = action.getTargetPosition();
        if (!(source instanceof Entity)) {
          return this.invalidateAction(
            action,
            targetPosition,
            i18next.t('validators.invalid_attack_message'),
          );
        }
        if (!source.getCanAttack() && !action.getIsAutomatic()) {
          return this.invalidateAction(
            action,
            action.getSourcePosition(),
            i18next.t('validators.unit_cannot_attack_message'),
          );
        }
        if (
          !source
            .getAttackRange()
            .getIsPositionValid(this.getGameSession().getBoard(), source, targetPosition)
        ) {
          return this.invalidateAction(
            action,
            targetPosition,
            i18next.t('validators.invalid_attack_position_message'),
          );
        }
      }
    }
  }
}
ValidatorEntityAction.prototype.type = 'ValidatorEntityAction';

module.exports = ValidatorEntityAction;
