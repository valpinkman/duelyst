/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PutCardInHandAction = require('@duelyst/sdk/actions/putCardInHandAction');
const CardType = require('../cards/cardType');
const ModifierOverwatchDestroyed = require('./modifierOverwatchDestroyed');

class ModifierOverwatchDestroyedPutCardInHand extends ModifierOverwatchDestroyed {
  declare type: any;

  static type = 'ModifierOverwatchDestroyedPutCardInHand';

  onOverwatch(action) {
    const a = new PutCardInHandAction(this.getGameSession(), this.getCard().getOwnerId(), {
      id: this.getCard().getId(),
    });
    return this.getGameSession().executeAction(a);
  }
}
ModifierOverwatchDestroyedPutCardInHand.prototype.type = 'ModifierOverwatchDestroyedPutCardInHand';

module.exports = ModifierOverwatchDestroyedPutCardInHand;
