/*
 * decaffeinate suggestions:
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const RemoveAction = require('./removeAction');
const CardType = require('app/sdk/cards/cardType');
const _ = require('underscore');

class DieAction extends RemoveAction {
  static initClass() {
    this.type = 'DieAction';
  }

  constructor() {
    super(...arguments);
  }
}
DieAction.initClass();

module.exports = DieAction;
