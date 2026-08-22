/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const RemoveAction = require('./removeAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const _ = require('underscore');

class DieAction extends RemoveAction {
  static type = 'DieAction';

  constructor() {
    super(...arguments);
  }
}

module.exports = DieAction;
