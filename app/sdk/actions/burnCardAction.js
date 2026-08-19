/*
 * decaffeinate suggestions:
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DrawCardAction = require('./drawCardAction');

class BurnCardAction extends DrawCardAction {
  static initClass() {
    this.type = 'BurnCardAction';

    this.prototype.burnCard = true;
  }

  constructor() {
    super(...arguments);
  }
}
BurnCardAction.initClass();

module.exports = BurnCardAction;
