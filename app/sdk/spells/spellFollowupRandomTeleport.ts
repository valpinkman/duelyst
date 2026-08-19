/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const Spell = require('./spell');
const CardType = require('app/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const RandomTeleportAction = require('app/sdk/actions/randomTeleportAction');
const _ = require('underscore');

class SpellFollowupRandomTeleport extends Spell {
  declare targetType: any;
  declare spellFilterType: any;
  declare teleportPattern: any;
  declare patternSourceIsTarget: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);
    const applyEffectPosition = { x, y };

    const target = board.getCardAtPosition(applyEffectPosition, this.targetType);

    // can be set within the card definition if we want the source index to be the target of the followup (only really to be used when teleportPattern is set)

    const randomTeleportAction = new RandomTeleportAction(this.getGameSession());
    randomTeleportAction.setOwnerId(this.getOwnerId());
    randomTeleportAction.setSource(target);
    randomTeleportAction.setTeleportPattern(this.teleportPattern);
    if (this.patternSourceIsTarget) {
      randomTeleportAction.setPatternSource(target);
    }
    randomTeleportAction.setFXResource(_.union(randomTeleportAction.getFXResource(), this.getFXResource()));
    return this.getGameSession().executeAction(randomTeleportAction);
  }
}
SpellFollowupRandomTeleport.prototype.targetType = CardType.Unit;
SpellFollowupRandomTeleport.prototype.spellFilterType = SpellFilterType.None;
SpellFollowupRandomTeleport.prototype.teleportPattern = null;
SpellFollowupRandomTeleport.prototype.patternSourceIsTarget = false;

module.exports = SpellFollowupRandomTeleport;
