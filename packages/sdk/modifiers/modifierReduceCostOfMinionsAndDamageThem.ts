/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifierManaModifier = require('@duelyst/sdk/playerModifiers/playerModifierManaModifier');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const PlayCardFromHandAction = require('@duelyst/sdk/actions/playCardFromHandAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const UtilsPosition = require('app/common/utils/utils_position');
const ModifierSummonWatch = require('./modifierSummonWatch');

class ModifierReduceCostOfMinionsAndDamageThem extends ModifierSummonWatch {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;

  static type = 'ModifierReduceCostOfMinionsAndDamageThem';
  static modifierName = 'Summon Watch (reduce cost of minions and damage them)';
  static description =
    'Your minions cost %X less to summon and take %Y damage when summoned from your action bar';

  static createContextObject(costChange, damageAmount, options) {
    const contextObject = super.createContextObject(options);
    contextObject.costChange = costChange;
    contextObject.damageAmount = damageAmount;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      const replaceText = this.description.replace(/%Y/, modifierContextObject.costChange);
      return replaceText.replace(/%X/, modifierContextObject.damageAmount);
    }
    return this.description;
  }

  onActivate() {
    super.onActivate();

    // set player mana modifier as sub-modifier of this modifier. that way, if this
    // unit is dispelled or killed, player modifier will be removed as well
    const contextObject = PlayerModifierManaModifier.createCostChangeContextObject(
      -1 * this.costChange,
      CardType.Unit,
    );
    contextObject.activeInHand =
      contextObject.activeInDeck =
      contextObject.activeInSignatureCards =
        false;
    contextObject.activeOnBoard = true;
    const ownPlayerId = this.getCard().getOwnerId();
    const ownGeneral = this.getGameSession().getGeneralForPlayerId(ownPlayerId);
    return this.applyManagedModifiersFromModifiersContextObjectsOnce([contextObject], ownGeneral);
  }

  getIsActionRelevant(action) {
    // watch for a unit being summoned from action bar by the player who owns this entity, don't trigger on summon of this unit
    return (
      action instanceof PlayCardFromHandAction &&
      action.getCard() !== this.getCard() &&
      super.getIsActionRelevant(action)
    );
  }

  onSummonWatch(action?) {
    const unitToDamage = action.getTarget();
    if (
      unitToDamage != null &&
      !UtilsPosition.getPositionsAreEqual(unitToDamage.getPosition(), this.getCard().getPosition())
    ) {
      // make sure we aren't trying to damage a clone summoned by a followup spawn (mirage master)
      const damageAction = new DamageAction(this.getGameSession());
      damageAction.setOwnerId(this.getCard().getOwnerId());
      damageAction.setSource(this.getCard());
      damageAction.setTarget(unitToDamage);
      damageAction.setDamageAmount(this.damageAmount);
      return this.getGameSession().executeAction(damageAction);
    }
  }
}
ModifierReduceCostOfMinionsAndDamageThem.prototype.type =
  'ModifierReduceCostOfMinionsAndDamageThem';
ModifierReduceCostOfMinionsAndDamageThem.prototype.activeInHand = false;
ModifierReduceCostOfMinionsAndDamageThem.prototype.activeInDeck = false;
ModifierReduceCostOfMinionsAndDamageThem.prototype.activeInSignatureCards = false;
ModifierReduceCostOfMinionsAndDamageThem.prototype.activeOnBoard = true;

module.exports = ModifierReduceCostOfMinionsAndDamageThem;
