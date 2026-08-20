/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const AttackAction = require('app/sdk/actions/attackAction');
const CardType = require('app/sdk/cards/cardType');
const DamageAction = require('app/sdk/actions/damageAction');
const i18next = require('i18next');
const ModifierSilence = require('./modifierSilence');
const Modifier = require('./modifier');

/*
This is purposely not a subclass of myAttackWatch, because this dispel should occur
on beforeAction, rather than onAction
*/

class ModifierSelfDamageAreaAttack extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare maxStacks: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierSelfDamageAreaAttack';

  onBeforeAction(actionEvent) {
    super.onBeforeAction(actionEvent);

    const a = actionEvent.action;
    if (a instanceof AttackAction && a.getSource() === this.getCard()) {
      let damageAction;
      let selfDamage = this.getCard().getATK();

      // damage the area too
      const entities = this.getGameSession()
        .getBoard()
        .getFriendlyEntitiesAroundEntity(a.getTarget(), CardType.Unit, 1);
      for (var entity of Array.from<any>(entities)) {
        damageAction = new DamageAction(this.getGameSession());
        damageAction.setOwnerId(this.getCard().getOwnerId());
        damageAction.setSource(this.getCard());
        damageAction.setTarget(entity);
        damageAction.setDamageAmount(this.getCard().getATK());
        this.getGameSession().executeAction(damageAction);
        selfDamage += this.getCard().getATK();
      }

      // then damage self a proportional amount
      damageAction = new DamageAction(this.getGameSession());
      damageAction.setOwnerId(this.getCard().getOwnerId());
      damageAction.setSource(this.getCard());
      damageAction.setTarget(this.getCard());
      damageAction.setDamageAmount(selfDamage);
      return this.getGameSession().executeAction(damageAction);
    }
  }
}
ModifierSelfDamageAreaAttack.prototype.type = 'ModifierSelfDamageAreaAttack';
ModifierSelfDamageAreaAttack.modifierName = i18next.t('modifiers.self_damage_area_attack_name');
ModifierSelfDamageAreaAttack.description = i18next.t('modifiers.self_damage_area_attack_def');
ModifierSelfDamageAreaAttack.prototype.activeInHand = false;
ModifierSelfDamageAreaAttack.prototype.activeInDeck = false;
ModifierSelfDamageAreaAttack.prototype.activeInSignatureCards = false;
ModifierSelfDamageAreaAttack.prototype.activeOnBoard = true;
ModifierSelfDamageAreaAttack.prototype.maxStacks = 1;

module.exports = ModifierSelfDamageAreaAttack;
