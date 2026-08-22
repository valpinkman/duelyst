/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DieAction = require('@duelyst/sdk/actions/dieAction');
const SetDamageAction = require('@duelyst/sdk/actions/setDamageAction');
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierEternalHeart extends Modifier {
  declare type: any;
  declare activeInDeck: any;
  declare activeInHand: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare maxStacks: any;
  declare fxResource: any;

  static type = 'ModifierEternalHeart';
  static modifierName = 'Eternal Heart';
  static description = "Can't die";

  getPrivateDefaults(gameSession) {
    const p = super.getPrivateDefaults(gameSession);

    p.eternalHeartAtActionIndexActionIndex = -1; // index of action triggering eternal heart

    return p;
  }

  onAfterCleanupAction(event) {
    super.onAfterCleanupAction(event);

    const { action } = event;
    if (
      this.getGameSession().getIsRunningAsAuthoritative() &&
      this._private.eternalHeartAtActionIndexActionIndex === action.getIndex()
    ) {
      // after cleaning up action, set HP to 1
      const setDamageAction = new SetDamageAction(this.getGameSession());
      setDamageAction.setOwnerId(this.getOwnerId());
      setDamageAction.setTarget(this.getCard());
      setDamageAction.damageValue = this.getCard().getMaxHP() - 1;
      return this.getGameSession().executeAction(setDamageAction);
    }
  }

  onValidateAction(event) {
    super.onValidateAction(event);

    const { action } = event;

    // when this would die, invalidate the death
    if (action instanceof DieAction && action.getTarget() === this.getCard()) {
      // record index of parent action of die action, so we know when to trigger eternal heart
      if (action.getParentAction() != null) {
        this._private.eternalHeartAtActionIndexActionIndex = action.getParentActionIndex();
      } else {
        this._private.eternalHeartAtActionIndexActionIndex = action.getIndex();
      }
      return this.invalidateAction(
        action,
        this.getCard().getPosition(),
        i18next.t('modifiers.eternal_heart_error'),
      );
    }
  }
}
ModifierEternalHeart.prototype.type = 'ModifierEternalHeart';
ModifierEternalHeart.prototype.activeInDeck = false;
ModifierEternalHeart.prototype.activeInHand = false;
ModifierEternalHeart.prototype.activeInSignatureCards = false;
ModifierEternalHeart.prototype.activeOnBoard = true;
ModifierEternalHeart.prototype.maxStacks = 1;
ModifierEternalHeart.prototype.fxResource = ['FX.Modifiers.EternalHeart'];

module.exports = ModifierEternalHeart;
