/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierSynergize = require('./modifierSynergize');

class ModifierSynergizeRefreshSpell extends ModifierSynergize {
  static type = 'ModifierSynergizeRefreshSpell';
  static description = 'Refresh your Bloodbound spell';

  onSynergize(action) {
    super.onSynergize(action);

    const player = this.getCard().getGameSession().getPlayerById(this.getCard().getOwnerId());
    return this.getGameSession().executeAction(player.actionActivateSignatureCard());
  }
}
ModifierSynergizeRefreshSpell.prototype.type = 'ModifierSynergizeRefreshSpell';
ModifierSynergizeRefreshSpell.prototype.fxResource = ['FX.Modifiers.ModifierSpellWatch'];

module.exports = ModifierSynergizeRefreshSpell;
