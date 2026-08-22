/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DrawCardAction = require('./drawCardAction');

class BurnCardAction extends DrawCardAction {
  declare burnCard: any;

  static type = 'BurnCardAction';

  constructor() {
    super(...arguments);
  }
}
BurnCardAction.prototype.burnCard = true;

module.exports = BurnCardAction;
