/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Cards = require('app/sdk/cards/cardsLookup');
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');

const i18next = require('i18next');
const ModifierSummonWatchFromActionBar = require('./modifierSummonWatchFromActionBar');

class ModifierSandPortal extends ModifierSummonWatchFromActionBar {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;
  declare static modifierName: any;
  declare static keywordDefinition: any;
  declare static description: any;

  static type = 'ModifierSandPortal';

  static getDescription() {
    return this.description;
  }

  static getCardsWithSandPortal(board, player) {
    // get all cards with sand portal modifiers owned by a player
    let allowUntargetable;
    const cards = [];
    for (var card of Array.from<any>(board.getCards(null, (allowUntargetable = true)))) {
      if (card.isOwnedBy(player) && card.hasModifierClass(ModifierSandPortal)) {
        cards.push(card);
      }
    }
    return cards;
  }

  onSummonWatch(action?) {
    let playCardAction;
    super.onSummonWatch(action);
    const board = this.getGameSession().getBoard();
    const entity = this.getGameSession().getCardCaches().getCardById(Cards.Faction3.IronDervish);
    const position = this.getCard().getPosition();

    const appliedToBoardByAction = this.getCard().getAppliedToBoardByAction();
    if (appliedToBoardByAction !== undefined) {
      const rootAppliedByCard = __guardMethod__(action.getRootAction(), 'getCard', (o) =>
        o.getCard().getRootCard(),
      );
      const thisAppliedByCard = __guardMethod__(
        appliedToBoardByAction.getRootAction(),
        'getCard',
        (o1) => o1.getCard().getRootCard(),
      );
      // spawn an Iron Dervish on this tile when you summon another minion UNLESS the minion being summoned also caused this tile to spawn
      // (i.e. don't trigger on own creation by opening gambit)
      if (
        !board.getObstructionAtPositionForEntity(position, entity) &&
        rootAppliedByCard !== thisAppliedByCard
      ) {
        playCardAction = new PlayCardSilentlyAction(
          this.getGameSession(),
          this.getOwnerId(),
          position.x,
          position.y,
          { id: Cards.Faction3.IronDervish },
        );
        playCardAction.setSource(this.getCard());
        return this.getGameSession().executeAction(playCardAction);
      }
    } else if (!board.getObstructionAtPositionForEntity(position, entity)) {
      playCardAction = new PlayCardSilentlyAction(
        this.getGameSession(),
        this.getOwnerId(),
        position.x,
        position.y,
        { id: Cards.Faction3.IronDervish },
      );
      playCardAction.setSource(this.getCard());
      return this.getGameSession().executeAction(playCardAction);
    }
  }
}
ModifierSandPortal.prototype.type = 'ModifierSandPortal';
ModifierSandPortal.modifierName = i18next.t('modifiers.exhuming_sand_name');
ModifierSandPortal.keywordDefinition = i18next.t('modifiers.exhuming_sand_def');
ModifierSandPortal.description = i18next.t('modifiers.exhuming_sand_def');
ModifierSandPortal.prototype.activeInHand = false;
ModifierSandPortal.prototype.activeInDeck = false;
ModifierSandPortal.prototype.activeInSignatureCards = false;
ModifierSandPortal.prototype.activeOnBoard = true;
ModifierSandPortal.prototype.fxResource = ['FX.Modifiers.ModifierShadowCreep'];

module.exports = ModifierSandPortal;

function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  }
  return undefined;
}
