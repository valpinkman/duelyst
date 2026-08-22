/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const SpellDamage = require('./spellDamage');
const CardType = require('@duelyst/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const DrawCardAction = require('@duelyst/sdk/actions/drawCardAction');

class SpellDamageEnemyGeneralBothDrawCard extends SpellDamage {
  declare targetType: any;
  declare spellFilterType: any;

  _findApplyEffectPositions(position, sourceAction) {
    const applyEffectPositions = [];

    // can only target enemy general
    const general = this.getGameSession().getGeneralForOpponentOfPlayerId(this.getOwnerId());
    if (general != null) {
      // apply spell on enemy General
      applyEffectPositions.push(general.getPosition());
    }

    return applyEffectPositions;
  }

  onApplyOneEffectToBoard(board, x, y, sourceAction) {
    // enemy draws a card
    const deck = this.getGameSession().getOpponentPlayerOfPlayerId(this.getOwnerId()).getDeck();
    this.getGameSession().executeAction(deck.actionDrawCard());

    // caster draws a card
    return this.getGameSession().executeAction(this.getOwner().getDeck().actionDrawCard());
  }
}
SpellDamageEnemyGeneralBothDrawCard.prototype.targetType = CardType.Unit;
SpellDamageEnemyGeneralBothDrawCard.prototype.spellFilterType = SpellFilterType.None;

module.exports = SpellDamageEnemyGeneralBothDrawCard;
