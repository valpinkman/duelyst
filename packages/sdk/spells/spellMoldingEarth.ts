/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const SpellSpawnEntity = require('./spellSpawnEntity');
const CardType = require('@duelyst/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const Cards = require('@duelyst/sdk/cards/cardsLookupComplete');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const CONFIG = require('app/common/config');
const ModifierBackstab = require('@duelyst/sdk/modifiers/modifierBackstab');
const ModifierBlastAttack = require('@duelyst/sdk/modifiers/modifierBlastAttack');
const ModifierTranscendance = require('@duelyst/sdk/modifiers/modifierTranscendance');
const ModifierFlying = require('@duelyst/sdk/modifiers/modifierFlying');
const ModifierForcefield = require('@duelyst/sdk/modifiers/modifierForcefield');
const ModifierFrenzy = require('@duelyst/sdk/modifiers/modifierFrenzy');
const ModifierGrow = require('@duelyst/sdk/modifiers/modifierGrow');
const ModifierProvoke = require('@duelyst/sdk/modifiers/modifierProvoke');
const ModifierRanged = require('@duelyst/sdk/modifiers/modifierRanged');
const ModifierRebirth = require('@duelyst/sdk/modifiers/modifierRebirth');
const ModifierFirstBlood = require('@duelyst/sdk/modifiers/modifierFirstBlood');

class SpellMoldingEarth extends SpellSpawnEntity {
  declare spawnSilently: any;
  declare numUnits: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    const modifiersToObtain = [
      ModifierFrenzy.createContextObject(),
      ModifierFlying.createContextObject(),
      ModifierTranscendance.createContextObject(),
      ModifierProvoke.createContextObject(),
      ModifierRanged.createContextObject(),
      ModifierFirstBlood.createContextObject(),
      ModifierRebirth.createContextObject(),
      ModifierForcefield.createContextObject(),
    ];

    const modifierContextObject =
      modifiersToObtain[
        this.getGameSession().getRandomIntegerForExecution(modifiersToObtain.length)
      ];

    this.cardDataOrIndexToSpawn.additionalInherentModifiersContextObjects = [modifierContextObject];

    return super.onApplyEffectToBoardTile(board, x, y, sourceAction);
  }

  _findApplyEffectPositions(position, sourceAction) {
    let applyEffectPositions;
    const card = this.getEntityToSpawn();
    const generalPosition = this.getGameSession().getGeneralForPlayerId(this.ownerId).getPosition();
    const numberOfApplyPositions = this.numUnits;

    if (numberOfApplyPositions > 0) {
      applyEffectPositions = UtilsGameSession.getRandomSmartSpawnPositionsFromPattern(
        this.getGameSession(),
        generalPosition,
        CONFIG.PATTERN_3x3,
        card,
        this,
        numberOfApplyPositions,
      );
    } else {
      applyEffectPositions = [];
    }

    return applyEffectPositions;
  }

  _postFilterPlayPositions(validPositions) {
    return validPositions;
  }
}
SpellMoldingEarth.prototype.spawnSilently = true;
SpellMoldingEarth.prototype.numUnits = 3;

module.exports = SpellMoldingEarth;
