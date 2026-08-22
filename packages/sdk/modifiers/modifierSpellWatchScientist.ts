/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
let Modifier = require('./modifier');
let CardType = require('@duelyst/sdk/cards/cardType');
Modifier = require('./modifier');
const SpellFilterType = require('@duelyst/sdk/spells/spellFilterType');
CardType = require('@duelyst/sdk/cards/cardType');
const ApplyCardToBoardAction = require('@duelyst/sdk/actions/applyCardToBoardAction');
const TeleportAction = require('@duelyst/sdk/actions/teleportAction');

class ModifierSpellWatchScientist extends Modifier {
  declare type: any;
  declare fxResource: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;

  static type = 'ModifierSpellWatchScientist';
  static modifierName = 'Spell Watch (Scientist)';
  static description = 'Whenever you cast a spell that targets a friendly minion, draw a card';

  onAction(event) {
    super.onAction(event);
    const { action } = event;
    let doDraw = false;
    if (
      action instanceof ApplyCardToBoardAction &&
      !action.getIsImplicit() &&
      action.getOwnerId() === this.getCard().getOwnerId() &&
      __guard__(action.getCard(), (x) => x.getType()) === CardType.Spell &&
      __guard__(
        __guard__(action.getCard(), (x2) => x2.getRootCard()),
        (x1) => x1.getType(),
      ) === CardType.Spell
    ) {
      // if spell might directly target an ally
      if (
        action.getCard().spellFilterType === SpellFilterType.AllyDirect ||
        action.getCard().spellFilterType === SpellFilterType.NeutralDirect
      ) {
        const target = this.getGameSession().getCardByIndex(
          action.getCard().getApplyEffectPositionsCardIndices()[0],
        );
        if (
          target != null &&
          target.getType() === CardType.Unit &&
          target.getOwnerId() === this.getCard().getOwnerId() &&
          !target.getIsGeneral()
        ) {
          doDraw = true;
        }
      }
    }

    if (doDraw) {
      return this.getGameSession().executeAction(
        this.getCard().getOwner().getDeck().actionDrawCard(),
      );
    }
  }
}
ModifierSpellWatchScientist.prototype.type = 'ModifierSpellWatchScientist';
ModifierSpellWatchScientist.prototype.fxResource = ['FX.Modifiers.ModifierSpellWatch'];
ModifierSpellWatchScientist.prototype.activeInHand = false;
ModifierSpellWatchScientist.prototype.activeInDeck = false;
ModifierSpellWatchScientist.prototype.activeInSignatureCards = false;
ModifierSpellWatchScientist.prototype.activeOnBoard = true;

module.exports = ModifierSpellWatchScientist;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
