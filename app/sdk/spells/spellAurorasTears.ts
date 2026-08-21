/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsGameSession = require('app/sdk/utils/utils_game_session');
const Spell = require('./spell');
const CardType = require('app/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const Modifier = require('app/sdk/modifiers/modifier');
const _ = require('underscore');

class SpellAurorasTears extends Spell {
  declare targetType: any;
  declare spellFilterType: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    const applyEffectPosition = { x, y };
    const general = board.getCardAtPosition(applyEffectPosition, this.targetType);
    // get all artifact modifiers and group by artifact
    const modifiersByArtifact = general.getArtifactModifiersGroupedByArtifactCard();
    if (modifiersByArtifact.length > 0) {
      const modifierContextObject = Modifier.createContextObjectWithAttributeBuffs(
        modifiersByArtifact.length * 2,
        0,
      );
      modifierContextObject.durationEndTurn = 1;
      modifierContextObject.appliedName = 'Infused Strength';
      return this.getGameSession().applyModifierContextObject(modifierContextObject, general);
    }
  }

  _findApplyEffectPositions(position, sourceAction) {
    const applyEffectPositions = [];

    // can only target your general
    const general = this.getGameSession().getGeneralForPlayerId(this.getOwnerId());
    if (general != null) {
      applyEffectPositions.push(general.getPosition());
    }

    return applyEffectPositions;
  }
}
SpellAurorasTears.prototype.targetType = CardType.Unit;
SpellAurorasTears.prototype.spellFilterType = SpellFilterType.NeutralIndirect;

module.exports = SpellAurorasTears;
