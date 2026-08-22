/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const Stringifiers = require('@duelyst/sdk/helpers/stringifiers');
const PlayCardSilentlyAction = require('@duelyst/sdk/actions/playCardSilentlyAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const CONFIG = require('app/common/config');
const Cards = require('@duelyst/sdk/cards/cardsLookupComplete');
const Factions = require('@duelyst/sdk/cards/factionsLookup');
const _ = require('underscore');
const i18next = require('i18next');
const ModifierStartTurnWatch = require('./modifierStartTurnWatch');

class ModifierStartTurnWatchEquipArtifact extends ModifierStartTurnWatch {
  declare type: any;
  declare amount: any;
  declare static description: any;

  static type = 'ModifierStartTurnWatchEquipArtifact';

  static createContextObject(amount, includedCards, options) {
    if (amount == null) {
      amount = 1;
    }
    const contextObject = super.createContextObject(options);
    contextObject.amount = amount;
    contextObject.includedCards = includedCards;
    return contextObject;
  }

  onTurnWatch(action) {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      return (() => {
        const result = [];
        for (
          let i = 0, end = this.amount, asc = end >= 0;
          asc ? i < end : i > end;
          asc ? i++ : i--
        ) {
          var artifactCard =
            this.includedCards[
              this.getGameSession().getRandomIntegerForExecution(this.includedCards.length)
            ]; // random artifact
          var cardDataOrIndexToPutInHand = artifactCard;
          var playCardAction = new PlayCardSilentlyAction(
            this.getGameSession(),
            this.getCard().getOwnerId(),
            this.getCard().getPosition().x,
            this.getCard().getPosition().y,
            cardDataOrIndexToPutInHand,
          );
          playCardAction.setSource(this.getCard());
          result.push(this.getGameSession().executeAction(playCardAction));
        }
        return result;
      })();
    }
  }
}
ModifierStartTurnWatchEquipArtifact.prototype.type = 'ModifierStartTurnWatchEquipArtifact';
ModifierStartTurnWatchEquipArtifact.description = i18next.t(
  'modifiers.start_turn_watch_equip_artifact_def',
);
ModifierStartTurnWatchEquipArtifact.prototype.amount = 1;

module.exports = ModifierStartTurnWatchEquipArtifact;
