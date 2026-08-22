/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS204: Change includes calls to have a more natural evaluation order
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const AttackAction = require('@duelyst/sdk/actions/attackAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const Modifier = require('./modifier');
const ModifierStunnedVanar = require('./modifierStunnedVanar');

class ModifierStunWhenAttacked extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare maxStacks: any;

  static type = 'ModifierStunWhenAttacked';
  static modifierName = 'Stunner';
  static description = 'Minions next to this minion that attack it are Stunned';

  onAction(actionEvent) {
    super.onAction(actionEvent);
    const a = actionEvent.action;
    // when this wall is directly attacked
    if (a instanceof AttackAction && a.getTarget() === this.getCard() && !a.getIsImplicit()) {
      // by a nearby minion
      let needle;
      if (
        !a.getSource().getIsGeneral() &&
        ((needle = a.getSource()),
        Array.from<any>(
          this.getCard()
            .getGameSession()
            .getBoard()
            .getEntitiesAroundEntity(this.getCard(), CardType.Unit, 1),
        ).includes(needle))
      ) {
        // stun the attacker
        return this.getGameSession().applyModifierContextObject(
          ModifierStunnedVanar.createContextObject(),
          a.getSource(),
        );
      }
    }
  }
}
ModifierStunWhenAttacked.prototype.type = 'ModifierStunWhenAttacked';
ModifierStunWhenAttacked.prototype.activeInHand = false;
ModifierStunWhenAttacked.prototype.activeInDeck = false;
ModifierStunWhenAttacked.prototype.activeInSignatureCards = false;
ModifierStunWhenAttacked.prototype.activeOnBoard = true;
ModifierStunWhenAttacked.prototype.maxStacks = 1;

module.exports = ModifierStunWhenAttacked;
