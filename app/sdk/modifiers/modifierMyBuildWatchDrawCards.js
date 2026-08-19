/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DrawCardAction = require('app/sdk/actions/drawCardAction');
const ModifierMyBuildWatch = require('./modifierMyBuildWatch');

class ModifierMyBuildWatchDrawCards extends ModifierMyBuildWatch {
  static type = 'ModifierMyBuildWatchDrawCards';

  static createContextObject(drawAmount, options) {
    const contextObject = super.createContextObject(options);
    contextObject.drawAmount = drawAmount;
    return contextObject;
  }

  onBuildWatch(action) {
    super.onBuildWatch();

    return __range__(0, this.drawAmount, false).map((i) =>
      this.getGameSession().executeAction(new DrawCardAction(this.getGameSession(), this.getCard().getOwnerId())));
  }
}
ModifierMyBuildWatchDrawCards.prototype.type = 'ModifierMyBuildWatchDrawCards';
ModifierMyBuildWatchDrawCards.prototype.drawAmount = 0;

module.exports = ModifierMyBuildWatchDrawCards;

function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}
