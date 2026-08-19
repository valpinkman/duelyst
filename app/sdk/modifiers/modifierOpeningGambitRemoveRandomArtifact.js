/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RemoveRandomArtifactAction = require('app/sdk/actions/removeRandomArtifactAction');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitRemoveRandomArtifact extends ModifierOpeningGambit {
  static type = 'ModifierOpeningGambitRemoveRandomArtifact';
  static modifierName = 'Opening Gambit';
  static description = 'Destroy a random enemy artifact';

  onOpeningGambit() {
    const general = this.getCard().getGameSession().getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId());
    const modifiersByArtifact = general.getArtifactModifiersGroupedByArtifactCard();

    // if enemy General has at least one artifact on, then remove 1 artifact at random
    if (modifiersByArtifact.length > 0) {
      const removeArtifactAction = new RemoveRandomArtifactAction(this.getGameSession());
      removeArtifactAction.setTarget(general);
      return this.getGameSession().executeAction(removeArtifactAction);
    }
  }
}
ModifierOpeningGambitRemoveRandomArtifact.prototype.type = 'ModifierOpeningGambitRemoveRandomArtifact';

module.exports = ModifierOpeningGambitRemoveRandomArtifact;
