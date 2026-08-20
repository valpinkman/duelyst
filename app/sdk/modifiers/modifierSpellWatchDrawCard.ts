/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DrawCardAction = require('app/sdk/actions/drawCardAction');
const ModifierSpellWatch = require('./modifierSpellWatch');

class ModifierSpellWatchDrawCard extends ModifierSpellWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierSpellWatchDrawCard';

  onSpellWatch(action) {
    return this.getGameSession().executeAction(
      new DrawCardAction(this.getGameSession(), this.getCard().getOwnerId()),
    );
  }
}
ModifierSpellWatchDrawCard.prototype.type = 'ModifierSpellWatchDrawCard';
ModifierSpellWatchDrawCard.prototype.fxResource = ['FX.Modifiers.ModifierSpellWatch'];

module.exports = ModifierSpellWatchDrawCard;
