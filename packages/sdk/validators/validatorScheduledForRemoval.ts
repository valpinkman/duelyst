/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Validator = require('./validator');
const Card = require('@duelyst/sdk/cards/card');
const RevealHiddenCardAction = require('@duelyst/sdk/actions/revealHiddenCardAction');
const RemoveModifierAction = require('@duelyst/sdk/actions/removeModifierAction');
const i18next = require('i18next');

class ValidatorScheduledForRemoval extends Validator {
  declare type: any;

  static type = 'ValidatorScheduledForRemoval';

  onValidateAction(event) {
    super.onValidateAction(event);
    const { action } = event;
    if (
      action != null &&
      action.getIsValid() &&
      action.getIsImplicit() &&
      !(action instanceof RemoveModifierAction || action instanceof RevealHiddenCardAction)
    ) {
      const target = action.getTarget();
      if (target instanceof Card && target.getIsPlayed()) {
        if (target.getIsRemoved()) {
          return this.invalidateAction(
            action,
            action.getTargetPosition(),
            i18next.t('validators.card_has_been_removed_message'),
          );
        }
        if (
          !action.getIsDepthFirst() &&
          !this.getGameSession().getCanCardBeScheduledForRemoval(target)
        ) {
          return this.invalidateAction(
            action,
            action.getTargetPosition(),
            i18next.t('validators.card_will_be_removed_message'),
          );
        }
      }
    }
  }
}
ValidatorScheduledForRemoval.prototype.type = 'ValidatorScheduledForRemoval';

module.exports = ValidatorScheduledForRemoval;
