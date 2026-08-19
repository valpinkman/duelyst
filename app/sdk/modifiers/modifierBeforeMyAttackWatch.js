/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const EVENTS = require('app/common/event_types');
const AttackAction = require('app/sdk/actions/attackAction');
const Modifier = require('./modifier');

class ModifierBeforeMyAttackWatch extends Modifier {
  static type = 'ModifierBeforeMyAttackWatch';

  onBeforeAction(event) {
    const a = event.action;
    if (a instanceof AttackAction && (a.getSource() === this.getCard())) {
      return this.onBeforeMyAttackWatch(a);
    }
  }

  onBeforeMyAttackWatch(action) {}
}
ModifierBeforeMyAttackWatch.prototype.type = 'ModifierBeforeMyAttackWatch';
ModifierBeforeMyAttackWatch.prototype.activeInHand = false;
ModifierBeforeMyAttackWatch.prototype.activeInDeck = false;
ModifierBeforeMyAttackWatch.prototype.activeInSignatureCards = false;
ModifierBeforeMyAttackWatch.prototype.activeOnBoard = true;
// override me in sub classes to implement special behavior

module.exports = ModifierBeforeMyAttackWatch;
