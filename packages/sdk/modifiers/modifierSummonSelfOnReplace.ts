/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const CONFIG = require('app/common/config');
const ReplaceCardFromHandAction = require('@duelyst/sdk/actions/replaceCardFromHandAction');
const PlayCardSilentlyAction = require('@duelyst/sdk/actions/playCardSilentlyAction');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const Modifier = require('./modifier');

class ModifierSummonSelfOnReplace extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierSummonSelfOnReplace';
  static modifierName = 'Summon Self On Replace';
  static description = 'When you replace this card, summon it nearby.  Your General takes 2 damage';

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/, modifierContextObject.description);
    }
    return this.description;
  }

  onAction(e) {
    super.onAction(e);

    const { action } = e;

    // watch for my player replacing THIS card
    if (
      action instanceof ReplaceCardFromHandAction &&
      action.getOwnerId() === this.getCard().getOwnerId()
    ) {
      const replacedCard = this.getGameSession().getExistingCardFromIndexOrCreateCardFromData(
        action.replacedCardIndex,
      );
      if (replacedCard === this.getCard()) {
        // and play this card in a random space nearby owner's General
        const general = this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId());
        const generalPosition = general.getPosition();
        const spawnLocations = UtilsGameSession.getRandomSmartSpawnPositionsFromPattern(
          this.getGameSession(),
          generalPosition,
          CONFIG.PATTERN_3x3,
          this.getCard(),
          this.getCard(),
        );
        if (spawnLocations.length > 0) {
          const playCardAction = new PlayCardSilentlyAction(
            this.getGameSession(),
            this.getCard().getOwnerId(),
            spawnLocations[0].x,
            spawnLocations[0].y,
            this.getCard().getIndex(),
          );
          this.getGameSession().executeAction(playCardAction);
          // and damage own General for 2
          const damageAction = new DamageAction(this.getGameSession());
          damageAction.setOwnerId(this.getCard().getOwnerId());
          damageAction.setSource(this.getCard());
          damageAction.setTarget(general);
          damageAction.setDamageAmount(2);
          return this.getGameSession().executeAction(damageAction);
        }
      }
    }
  }
}
ModifierSummonSelfOnReplace.prototype.type = 'ModifierSummonSelfOnReplace';
ModifierSummonSelfOnReplace.prototype.activeInHand = true;
ModifierSummonSelfOnReplace.prototype.activeInDeck = true;
ModifierSummonSelfOnReplace.prototype.activeInSignatureCards = false;
ModifierSummonSelfOnReplace.prototype.activeOnBoard = false;
ModifierSummonSelfOnReplace.prototype.fxResource = ['FX.Modifiers.ModifierBuffSelfOnReplace'];

module.exports = ModifierSummonSelfOnReplace;
