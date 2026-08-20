/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const Spell = require('./spell');
const CardType = require('app/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const KillAction = require('app/sdk/actions/killAction');
const PlayerModifierManaModifierSingleUse = require('app/sdk/playerModifiers/playerModifierManaModifierSingleUse');

class SpellDarkSacrifice extends Spell {
  declare targetType: any;
  declare spellFilterType: any;
  declare canTargetGeneral: any;
  declare costChange: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);
    const applyEffectPosition = { x, y };
    const entity = board.getCardAtPosition(applyEffectPosition, this.targetType);

    // Logger.module("SDK").debug "[G:#{@.getGameSession().gameId}]", "SpellDarkSacrifice::onApplyEffectToBoardTile -> explode #{entity.name}"

    // kill the target entity
    const killAction = new KillAction(this.getGameSession());
    killAction.setOwnerId(this.getOwnerId());
    killAction.setTarget(entity);
    this.getGameSession().executeAction(killAction);

    // add cost reduction for next unit card
    this.getGameSession().applyModifierContextObject(
      PlayerModifierManaModifierSingleUse.createCostChangeContextObject(
        this.costChange,
        CardType.Unit,
      ),
      this.getGameSession().getGeneralForPlayerId(this.getOwnerId()),
    );

    return true;
  }
}
SpellDarkSacrifice.prototype.targetType = CardType.Unit;
SpellDarkSacrifice.prototype.spellFilterType = SpellFilterType.AllyDirect;
SpellDarkSacrifice.prototype.canTargetGeneral = false;
SpellDarkSacrifice.prototype.costChange = -3;

module.exports = SpellDarkSacrifice;
