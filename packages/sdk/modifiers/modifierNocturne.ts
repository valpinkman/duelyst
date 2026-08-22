/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ApplyCardToBoardAction = require('@duelyst/sdk/actions/applyCardToBoardAction');
const PlayCardSilentlyAction = require('@duelyst/sdk/actions/playCardSilentlyAction');
const Cards = require('@duelyst/sdk/cards/cardsLookupComplete');
const Modifier = require('./modifier');

class ModifierNocturne extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierNocturne';
  static modifierName = 'ModifierNocturne';
  static description = 'Whenever you make Shadow Creep or a Wraithling, instead make both';

  onAfterCleanupAction(e) {
    super.onAfterCleanupAction(e);

    const { action } = e;

    if (
      action instanceof ApplyCardToBoardAction &&
      action.getOwnerId() === this.getCard().getOwnerId()
    ) {
      // if summoning a wraithling
      let playCardAction;
      if (action.getCard().getBaseCardId() === Cards.Faction4.Wraithling) {
        // also spawn a shadow creep
        playCardAction = new PlayCardSilentlyAction(
          this.getGameSession(),
          this.getCard().getOwnerId(),
          action.getTargetPosition().x,
          action.getTargetPosition().y,
          { id: Cards.Tile.Shadow },
        );
        playCardAction.setSource(this.getCard());
        return this.getGameSession().executeAction(playCardAction);
        // if summoning a shadow creep tile
      }
      if (action.getCard().getBaseCardId() === Cards.Tile.Shadow) {
        // also spawn a wraithling
        playCardAction = new PlayCardSilentlyAction(
          this.getGameSession(),
          this.getCard().getOwnerId(),
          action.getTargetPosition().x,
          action.getTargetPosition().y,
          { id: Cards.Faction4.Wraithling },
        );
        playCardAction.setSource(this.getCard());
        return this.getGameSession().executeAction(playCardAction);
      }
    }
  }
}
ModifierNocturne.prototype.type = 'ModifierNocturne';
ModifierNocturne.prototype.activeInHand = false;
ModifierNocturne.prototype.activeInDeck = false;
ModifierNocturne.prototype.activeInSignatureCards = false;
ModifierNocturne.prototype.activeOnBoard = true;
ModifierNocturne.prototype.fxResource = ['FX.Modifiers.ModifierSummonWatch'];

module.exports = ModifierNocturne;
