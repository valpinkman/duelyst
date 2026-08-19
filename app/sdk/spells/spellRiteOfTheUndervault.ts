/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const Spell = require('./spell');
const CardType = require('app/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const _ = require('underscore');

class SpellRiteOfTheUndervault extends Spell {
  declare spellFilterType: any;

  onApplyOneEffectToBoard(board, x, y, sourceAction) {
    super.onApplyOneEffectToBoard(board, x, y, sourceAction);

    // draw to fill hand for player who just cast this spell
    const player = this.getGameSession().getPlayerById(this.getOwnerId());
    return Array.from<any>(player.getDeck().actionsDrawCardsToRefillHand()).map((action) =>
      this.getGameSession().executeAction(action));
  }
}
SpellRiteOfTheUndervault.prototype.spellFilterType = SpellFilterType.NeutralIndirect;

module.exports = SpellRiteOfTheUndervault;
