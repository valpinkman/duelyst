/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('@duelyst/common/logger');
const ApplyCardToBoardAction = require('./applyCardToBoardAction');
const ModifierOpeningGambit = require('@duelyst/sdk/modifiers/modifierOpeningGambit');
const _ = require('underscore');

/*
Play a card on the board and bypass the active card flow (i.e. followups and opening gambits are disabled)
*/

class PlayCardSilentlyAction extends ApplyCardToBoardAction {
  static type = 'PlayCardSilentlyAction';

  constructor() {
    super(...arguments);
  }

  getCard() {
    if (this._private.cachedCard == null) {
      // create and cache card
      super.getCard();

      if (this._private.cachedCard != null) {
        // clear the card's followups
        this._private.cachedCard.clearFollowups();
      }
    }

    return this._private.cachedCard;
  }
}

module.exports = PlayCardSilentlyAction;
