/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitEquipArtifact extends ModifierOpeningGambit {
  declare type: any;
  declare cardDataOrIndexToEquip: any;

  static type = 'ModifierOpeningGambitEquipArtifact';
  static description = 'Equip an artifact to you General';

  static createContextObject(cardDataOrIndexToEquip, options) {
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToEquip = cardDataOrIndexToEquip;
    return contextObject;
  }

  onOpeningGambit(action) {
    super.onOpeningGambit(action);

    const gameSession = this.getGameSession();
    const playCardAction = new PlayCardSilentlyAction(
      gameSession,
      this.getCard().getOwnerId(),
      this.getCard().getPosition().x,
      this.getCard().getPosition().y,
      this.cardDataOrIndexToEquip,
    );
    playCardAction.setSource(this.getCard());
    return gameSession.executeAction(playCardAction);
  }
}
ModifierOpeningGambitEquipArtifact.prototype.type = 'ModifierOpeningGambitEquipArtifact';
ModifierOpeningGambitEquipArtifact.prototype.cardDataOrIndexToEquip = 0;

module.exports = ModifierOpeningGambitEquipArtifact;
