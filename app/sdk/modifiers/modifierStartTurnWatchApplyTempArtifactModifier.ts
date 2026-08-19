/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierStartTurnWatch = require('./modifierStartTurnWatch');

class ModifierStartTurnWatchApplyTempArtifactModifier extends ModifierStartTurnWatch {
  declare type: any;
  declare modifierContextObject: any;

  static type = 'ModifierStartTurnWatchApplyTempArtifactModifier';

  onActivate() {
    super.onActivate();

    // when activated on owner's turn, immediately apply modifier for this turn
    if (this.getCard().isOwnersTurn()) {
      const general = this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId());
      return this.getGameSession().applyModifierContextObject(this.modifierContextObject, general, this);
    }
  }

  static createContextObject(modifierContextObject, options) {
    const contextObject = super.createContextObject(options);
    modifierContextObject.durationEndTurn = 1;
    modifierContextObject.isRemovable = false;
    contextObject.modifierContextObject = modifierContextObject;
    return contextObject;
  }

  onTurnWatch() {
    super.onTurnWatch();

    const general = this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId());
    return this.getGameSession().applyModifierContextObject(this.modifierContextObject, general, this);
  }
}
ModifierStartTurnWatchApplyTempArtifactModifier.prototype.type = 'ModifierStartTurnWatchApplyTempArtifactModifier';
ModifierStartTurnWatchApplyTempArtifactModifier.prototype.modifierContextObject = null;

module.exports = ModifierStartTurnWatchApplyTempArtifactModifier;
