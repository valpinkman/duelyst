/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RemoveArtifactsAction = require('@duelyst/sdk/actions/removeArtifactsAction');
const ModifierOpeningGambit = require('./modifierOpeningGambit');
const ModifierSilence = require('./modifierSilence');

class ModifierOpeningGambitGoleminate extends ModifierOpeningGambit {
  declare type: any;

  static type = 'ModifierOpeningGambitGoleminate';
  static modifierName = 'Opening Gambit';
  static description = 'Dispel EVERYTHING and destroy ALL artifacts.';

  onOpeningGambit() {
    return (() => {
      const result = [];
      for (var entity of Array.from<any>(this.getGameSession().getBoard().getEntities())) {
        // dispel every entity on the board
        if (!(entity === this.getCard())) {
          // don't dispel self though
          this.getGameSession().applyModifierContextObject(
            ModifierSilence.createContextObject(),
            entity,
          );
          if (entity.getIsGeneral()) {
            // if entity is a General, remove all Artifacts
            var removeArtifactsAction = new RemoveArtifactsAction(this.getGameSession());
            removeArtifactsAction.setTarget(entity);
            result.push(this.getGameSession().executeAction(removeArtifactsAction));
          } else {
            result.push(undefined);
          }
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
}
ModifierOpeningGambitGoleminate.prototype.type = 'ModifierOpeningGambitGoleminate';

module.exports = ModifierOpeningGambitGoleminate;
