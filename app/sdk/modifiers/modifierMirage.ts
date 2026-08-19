/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const AttackAction = require('app/sdk/actions/attackAction');
const CardType = require('app/sdk/cards/cardType');
const RemoveAction = require('app/sdk/actions/removeAction');
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierMirage extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare isRemovable: any;
  declare fxResource: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierMirage';

  onBeforeAction(event) {
    super.onBeforeAction(event);
    const {
      action,
    } = event;

    // supress strikeback on this minion since it must vanish immediately when attacked
    if (action instanceof AttackAction && (action.getTarget() === this.getCard()) && action.getIsStrikebackAllowed()) {
      action.setIsStrikebackAllowed(false);
    }

    // when attacked, remove self immediately
    if (action instanceof AttackAction && (action.getTarget() === this.getCard()) && !action.getIsImplicit()) {
      const thisEntity = this.getCard();
      if (__guard__(this.getCard(), (x) => x.getIsActive())) {
        const removeOriginalEntityAction = new RemoveAction(this.getGameSession());
        removeOriginalEntityAction.setOwnerId(thisEntity.getOwnerId());
        removeOriginalEntityAction.setTarget(thisEntity);
        removeOriginalEntityAction.setIsDepthFirst(true);
        return this.getGameSession().executeAction(removeOriginalEntityAction);
      }
    }
  }
}
ModifierMirage.prototype.type = 'ModifierMirage';
ModifierMirage.modifierName = i18next.t('modifiers.mirage_name');
ModifierMirage.description = i18next.t('modifiers.mirage_def');
ModifierMirage.prototype.activeInHand = false;
ModifierMirage.prototype.activeInDeck = false;
ModifierMirage.prototype.activeInSignatureCards = false;
ModifierMirage.prototype.activeOnBoard = true;
ModifierMirage.prototype.isRemovable = false;
ModifierMirage.prototype.fxResource = ['FX.Modifiers.ModifierMirage'];

module.exports = ModifierMirage;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
