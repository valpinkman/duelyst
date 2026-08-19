/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const ModifierEnemySpellWatch = require('./modifierEnemySpellWatch');

class ModifierEnemySpellWatchCopySpell extends ModifierEnemySpellWatch {
  static type = 'ModifierEnemySpellWatchCopySpell';
  static modifierName = 'Enemy Spell Watch Copy Spell';
  static description = 'Whenever the opponent casts a spell, gain of copy of the spell';

  onEnemySpellWatch(action) {
    const spell = action.getTarget();
    if (spell != null) {
      const putCardInHandAction = new PutCardInHandAction(this.getGameSession(), this.getCard().getOwnerId(), spell.createNewCardData());
      return this.getGameSession().executeAction(putCardInHandAction);
    }
  }
}
ModifierEnemySpellWatchCopySpell.prototype.type = 'ModifierEnemySpellWatchCopySpell';
ModifierEnemySpellWatchCopySpell.prototype.fxResource = ['FX.Modifiers.ModifierSpellWatch'];

module.exports = ModifierEnemySpellWatchCopySpell;
