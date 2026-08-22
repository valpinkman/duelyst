/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const CardType = require('@duelyst/sdk/cards/cardType');
const Cards = require('@duelyst/sdk/cards/cardsLookupComplete');
const PlayCardAction = require('@duelyst/sdk/actions/playCardAction');
const PlayCardFromHandAction = require('@duelyst/sdk/actions/playCardFromHandAction');
const PutCardInHandAction = require('@duelyst/sdk/actions/putCardInHandAction');
const Modifier = require('./modifier');

class ModifierMechazorWatchPutMechazorInHand extends Modifier {
  declare type: any;
  declare cardDataOrIndexToSpawn: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;

  static type = 'ModifierMechazorWatchPutMechazorInHand';
  static modifierName = 'Spawn Another Mechazor';
  static description = 'Whenever you summon MECHAZ0R, put a MECHAZ0R in your action bar';

  onAction(e) {
    super.onAction(e);

    const { action } = e;

    if (
      (action instanceof PlayCardAction &&
        action.getOwnerId() === this.getCard().getOwnerId() &&
        action.getCard().getBaseCardId() === Cards.Spell.DeployMechaz0r) ||
      (action instanceof PlayCardFromHandAction &&
        action.getOwnerId() === this.getCard().getOwnerId() &&
        action.getCard().getBaseCardId() === Cards.Neutral.Mechaz0r)
    ) {
      const a = new PutCardInHandAction(this.getGameSession(), this.getCard().getOwnerId(), {
        id: Cards.Neutral.Mechaz0r,
      });
      return this.getGameSession().executeAction(a);
    }
  }
}
ModifierMechazorWatchPutMechazorInHand.prototype.type = 'ModifierMechazorWatchPutMechazorInHand';
ModifierMechazorWatchPutMechazorInHand.prototype.cardDataOrIndexToSpawn = null;
ModifierMechazorWatchPutMechazorInHand.prototype.activeInHand = false;
ModifierMechazorWatchPutMechazorInHand.prototype.activeInDeck = false;
ModifierMechazorWatchPutMechazorInHand.prototype.activeInSignatureCards = false;
ModifierMechazorWatchPutMechazorInHand.prototype.activeOnBoard = true;

module.exports = ModifierMechazorWatchPutMechazorInHand;
