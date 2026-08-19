/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardFromHandAction = require('app/sdk/actions/playCardFromHandAction');
const PlayCardAction = require('app/sdk/actions/playCardAction');
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const CardType = require('app/sdk/cards/cardType');
const Modifier = require('./modifier');

class ModifierEquipFriendlyArtifactWatch extends Modifier {
  static type = 'ModifierEquipFriendlyArtifactWatch';

  onAction(event) {
    super.onAction(event);
    const {
      action,
    } = event;
    if ((action instanceof PlayCardFromHandAction || action instanceof PlayCardAction || action instanceof PlayCardSilentlyAction) && (action.getOwnerId() === this.getCard().getOwnerId()) && (__guard__(action.getCard(), (x) => x.type) === CardType.Artifact)) {
      return this.onEquipFriendlyArtifactWatch(action, action.getCard());
    }
  }

  onEquipFriendlyArtifactWatch(action, artifact) {}
}
ModifierEquipFriendlyArtifactWatch.prototype.type = 'ModifierEquipFriendlyArtifactWatch';
ModifierEquipFriendlyArtifactWatch.prototype.activeInHand = false;
ModifierEquipFriendlyArtifactWatch.prototype.activeInDeck = false;
ModifierEquipFriendlyArtifactWatch.prototype.activeInSignatureCards = false;
ModifierEquipFriendlyArtifactWatch.prototype.activeOnBoard = true;
ModifierEquipFriendlyArtifactWatch.prototype.fxResource = ['FX.Modifiers.ModifierMyMoveWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierEquipFriendlyArtifactWatch;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
