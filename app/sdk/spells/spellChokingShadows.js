/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const Spell = require('./spell');
const CardType = require('app/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const DamageAction = require('app/sdk/actions/damageAction');
const PlayCardAction = require('app/sdk/actions/playCardAction');

const CONFIG = require('app/common/config');

class SpellChokingShadows extends Spell {
  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    // Logger.module("SDK").debug "[G:#{@.getGameSession().gameId}]", "ChokingShadows::onApplyEffectToBoardTile"
    const applyEffectPosition = { x, y };

    // always spawn a shadow tile at each position
    if (board.isOnBoard(applyEffectPosition)) {
      const action = new PlayCardAction(this.getGameSession(), this.getOwnerId(), x, y, this.cardDataOrIndexToSpawn);
      action.setOwnerId(this.getOwnerId());
      return this.getGameSession().executeAction(action);
    }
  }
}
SpellChokingShadows.prototype.targetType = CardType.Unit;
SpellChokingShadows.prototype.spellFilterType = SpellFilterType.None;
SpellChokingShadows.prototype.cardDataOrIndexToSpawn = null;

module.exports = SpellChokingShadows;
