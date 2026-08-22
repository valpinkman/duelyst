/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('@duelyst/common/logger');
const Spell = require('./spell');
const CardType = require('@duelyst/sdk/cards/cardType');
const PlayCardSilentlyAction = require('@duelyst/sdk/actions/playCardSilentlyAction');

class SpellMetalworking extends Spell {
  declare numArtifacts: any;

  _findApplyEffectPositions(position, sourceAction) {
    return [this.getGameSession().getGeneralForPlayerId(this.getOwnerId()).getPosition()];
  }

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    const potentialArtifacts = [];
    const artifactsPlayed = this.getGameSession().getArtifactsPlayed(this.getOwnerId());
    const myGeneral = this.getGameSession().getGeneralForPlayerId(this.getOwnerId());
    // check all played artifact cards
    for (var artifact of Array.from<any>(artifactsPlayed)) {
      var modifiersGroupedByArtifactCard = myGeneral.getArtifactModifiersGroupedByArtifactCard();
      // if no artifact modifiers are stil on the general, all played artifacts are valid to retrieve
      if (modifiersGroupedByArtifactCard.length === 0) {
        potentialArtifacts.push(artifact);
      } else {
        var skipThisArtifact = false;
        // if general still has any artifacts, do NOT retrieve those exact artifacts
        for (var artifactMods of Array.from<any>(modifiersGroupedByArtifactCard)) {
          // skip any played artifacts that are still active on the General
          if (artifactMods[0].getSourceCard().getIndex() === artifact.getIndex()) {
            skipThisArtifact = true;
            break;
          }
        }
        if (!skipThisArtifact) {
          potentialArtifacts.push(artifact);
        }
      }
    }
    if (potentialArtifacts.length > 0) {
      const artifactToPlay =
        potentialArtifacts[
          this.getGameSession().getRandomIntegerForExecution(potentialArtifacts.length)
        ];

      if (artifactToPlay != null) {
        const playCardAction = new PlayCardSilentlyAction(
          this.getGameSession(),
          this.getOwnerId(),
          x,
          y,
          artifactToPlay.createNewCardData(),
        );
        playCardAction.setSource(this);
        return this.getGameSession().executeAction(playCardAction);
      }
    }
  }
}
SpellMetalworking.prototype.numArtifacts = 1;

module.exports = SpellMetalworking;
