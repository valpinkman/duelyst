/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ReplaceCardFromHandAction = require('app/sdk/actions/replaceCardFromHandAction');
const i18next = require('i18next');
const DamageAction = require('app/sdk/actions/damageAction');
const Modifier = require('./modifier');

class ModifierDamageBothGeneralsOnReplace extends Modifier {
  static type = 'ModifierDamageBothGeneralsOnReplace';

  static createContextObject(damageAmount, options) {
    if (damageAmount == null) { damageAmount = 3; }
    if (options == null) { options = undefined; }
    const contextObject = super.createContextObject(options);
    contextObject.damageAmount = damageAmount;
    return contextObject;
  }

  onAction(e) {
    super.onAction(e);

    const {
      action,
    } = e;

    // watch for my player replacing THIS card
    if (action instanceof ReplaceCardFromHandAction && (action.getOwnerId() === this.getCard().getOwnerId())) {
      const replacedCard = this.getGameSession().getExistingCardFromIndexOrCreateCardFromData(action.replacedCardIndex);
      if (replacedCard === this.getCard()) {
        const opponentGeneral = this.getGameSession().getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId());
        const myGeneral = this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId());

        const damageAction = this.getCard().getGameSession().createActionForType(DamageAction.type);
        damageAction.setSource(this.getCard());
        damageAction.setTarget(opponentGeneral);
        damageAction.setDamageAmount(this.damageAmount);
        this.getCard().getGameSession().executeAction(damageAction);

        const damageAction2 = this.getCard().getGameSession().createActionForType(DamageAction.type);
        damageAction2.setSource(this.getCard());
        damageAction2.setTarget(myGeneral);
        damageAction2.setDamageAmount(this.damageAmount);
        return this.getCard().getGameSession().executeAction(damageAction2);
      }
    }
  }
}
ModifierDamageBothGeneralsOnReplace.prototype.type = 'ModifierDamageBothGeneralsOnReplace';
ModifierDamageBothGeneralsOnReplace.prototype.activeInHand = true;
ModifierDamageBothGeneralsOnReplace.prototype.activeInDeck = true;
ModifierDamageBothGeneralsOnReplace.prototype.activeInSignatureCards = false;
ModifierDamageBothGeneralsOnReplace.prototype.activeOnBoard = false;
ModifierDamageBothGeneralsOnReplace.prototype.fxResource = ['FX.Modifiers.ModifierBuffSelfOnReplace'];

module.exports = ModifierDamageBothGeneralsOnReplace;
