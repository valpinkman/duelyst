/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const HealAction = require('@duelyst/sdk/actions/healAction');

const i18next = require('i18next');
const ModifierEndTurnWatch = require('./modifierEndTurnWatch');

class ModifierHallowedGround extends ModifierEndTurnWatch {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;
  declare healAmount: any;
  declare static modifierName: any;
  declare static keywordDefinition: any;
  declare static description: any;

  static type = 'ModifierHallowedGround';

  static getDescription() {
    return this.description;
  }

  static getCardsWithHallowedGround(board, player) {
    // get all cards with hallowed ground modifiers owned by a player
    let allowUntargetable;
    const cards = [];
    for (var card of Array.from<any>(board.getCards(null, (allowUntargetable = true)))) {
      if (card.isOwnedBy(player) && card.hasModifierClass(ModifierHallowedGround)) {
        cards.push(card);
      }
    }
    return cards;
  }

  static getNumStacksForPlayer(board, player) {
    // get the number of stacking hallowed ground modifiers
    let allowUntargetable;
    let numStacks = 0;
    for (var card of Array.from<any>(board.getCards(null, (allowUntargetable = true)))) {
      if (card.isOwnedBy(player)) {
        numStacks += card.getNumModifiersOfClass(ModifierHallowedGround);
      }
    }
    return numStacks;
  }

  onTurnWatch(actionEvent) {
    super.onTurnWatch(actionEvent);

    // at end of my turn, if there is a friendly unit on this hallowed ground
    const unit = this.getGameSession().getBoard().getUnitAtPosition(this.getCard().getPosition());
    if (unit != null && this.getCard().getIsSameTeamAs(unit)) {
      const healAction = new HealAction(this.getGameSession());
      healAction.setSource(this.getCard());
      healAction.setTarget(unit);
      healAction.setHealAmount(this.healAmount);
      return this.getGameSession().executeAction(healAction);
    }
  }
}
ModifierHallowedGround.prototype.type = 'ModifierHallowedGround';
ModifierHallowedGround.modifierName = i18next.t('modifiers.hallowed_ground_name');
ModifierHallowedGround.keywordDefinition = i18next.t('modifiers.hallowed_ground_def');
ModifierHallowedGround.description = i18next.t('modifiers.hallowed_ground_def');
ModifierHallowedGround.prototype.activeInHand = false;
ModifierHallowedGround.prototype.activeInDeck = false;
ModifierHallowedGround.prototype.activeInSignatureCards = false;
ModifierHallowedGround.prototype.activeOnBoard = true;
ModifierHallowedGround.prototype.fxResource = ['FX.Modifiers.ModifierHallowedGround'];
ModifierHallowedGround.prototype.healAmount = 1;

module.exports = ModifierHallowedGround;
