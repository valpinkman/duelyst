/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const Logger = require('app/common/logger');
const ApplyCardToBoardAction = require('./applyCardToBoardAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const _ = require('underscore');

/*
Play a card to board and allow it to enact the full play card flow (followups, spawn effects, etc)
*/

class PlayCardAction extends ApplyCardToBoardAction {
  static type = 'PlayCardAction';

  constructor() {
    super(...arguments);
  }
}

module.exports = PlayCardAction;
