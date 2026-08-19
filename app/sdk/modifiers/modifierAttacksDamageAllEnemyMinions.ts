/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const AttackAction = require('app/sdk/actions/attackAction');
const CardType = require('app/sdk/cards/cardType');
const DamageAction = require('app/sdk/actions/damageAction');
const Modifier = require('./modifier');

class ModifierAttacksDamageAllEnemyMinions extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare maxStacks: any;

  static type = 'ModifierAttacksDamageAllEnemyMinions';
  static modifierName = 'Attacks Damage All Enemy Minions';
  static description = 'Attacks damage all enemy minions';

  onBeforeAction(actionEvent) {
    super.onBeforeAction(actionEvent);

    const a = actionEvent.action;
    if (a instanceof AttackAction && (a.getSource() === this.getCard())) {
      const entities = this.getGameSession().getBoard().getFriendlyEntitiesForEntity(a.getTarget());
      return (() => {
        const result = [];
        for (var entity of Array.from<any>(entities)) {
          if (!entity.getIsGeneral()) { // do not target the general
            var damageAction = new DamageAction(this.getGameSession());
            damageAction.setOwnerId(this.getCard().getOwnerId());
            damageAction.setSource(this.getCard());
            damageAction.setTarget(entity);
            damageAction.setDamageAmount(this.getCard().getATK());
            result.push(this.getGameSession().executeAction(damageAction));
          } else {
            result.push(undefined);
          }
        }
        return result;
      })();
    }
  }
}
ModifierAttacksDamageAllEnemyMinions.prototype.type = 'ModifierAttacksDamageAllEnemyMinions';
ModifierAttacksDamageAllEnemyMinions.prototype.activeInHand = false;
ModifierAttacksDamageAllEnemyMinions.prototype.activeInDeck = false;
ModifierAttacksDamageAllEnemyMinions.prototype.activeInSignatureCards = false;
ModifierAttacksDamageAllEnemyMinions.prototype.activeOnBoard = true;
ModifierAttacksDamageAllEnemyMinions.prototype.maxStacks = 1;

module.exports = ModifierAttacksDamageAllEnemyMinions;
