/*
 * decaffeinate suggestions:
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const Logger = require('app/common/logger');
const ApplyCardToBoardAction = require('./applyCardToBoardAction');
const CardType = require('app/sdk/cards/cardType');
const _ = require('underscore');

/*
Play a card to board and allow it to enact the full play card flow (followups, spawn effects, etc)
*/

class PlayCardAction extends ApplyCardToBoardAction {
  static initClass() {
    this.type = 'PlayCardAction';
  }

  constructor() {
    super(...arguments);
  }
}
PlayCardAction.initClass();

module.exports = PlayCardAction;
