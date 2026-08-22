/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const PutCardInHandAction = require('@duelyst/sdk/actions/putCardInHandAction');
const Modifier = require('./modifier');
const ModifierDrawCardWatch = require('./modifierDrawCardWatch');

class ModifierDrawCardWatchCopySpell extends ModifierDrawCardWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierDrawCardWatchCopySpell';
  static modifierName = 'Draw Card Watch';
  static description = 'Whenever you draw a spell, put another copy of it in your Action Bar';

  onDrawCardWatch(action) {
    if (__guard__(action.getCard(), (x) => x.getType()) === CardType.Spell) {
      const a = new PutCardInHandAction(
        this.getGameSession(),
        this.getCard().getOwnerId(),
        action.getCard().createCloneCardData(),
      );
      return this.getGameSession().executeAction(a);
    }
  }
}
ModifierDrawCardWatchCopySpell.prototype.type = 'ModifierDrawCardWatchCopySpell';
ModifierDrawCardWatchCopySpell.prototype.fxResource = ['FX.Modifiers.ModifierDrawCardWatch'];

module.exports = ModifierDrawCardWatchCopySpell;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
