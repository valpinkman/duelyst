/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const Spell = require('./spell');
const CardType = require('@duelyst/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const ModifierDyingWish = require('@duelyst/sdk/modifiers/modifierDyingWish');
const ModifierManaCostChange = require('@duelyst/sdk/modifiers/modifierManaCostChange');
const _ = require('underscore');

class SpellLurkingFear extends Spell {
  declare targetType: any;
  declare spellFilterType: any;
  declare cardTypeToTarget: any;

  onApplyOneEffectToBoard(board, x, y, sourceAction) {
    super.onApplyOneEffectToBoard(board, x, y, sourceAction);

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      let cards = [];
      const deck = this.getOwner().getDeck();
      cards = cards.concat(deck.getCardsInHandExcludingMissing(), deck.getCardsInDrawPile());
      return (() => {
        const result = [];
        for (var card of Array.from<any>(cards)) {
          // search for Dying Wish modifier and keyword class Dying Wish
          // searching by keyword class because some units have "dying wishes" that are not specified as Dying Wish keyword
          // (ex - Snow Chaser 'replicate')
          // but don't want to catch minions that grant others Dying Wish (ex - Ancient Grove)
          if (card.hasModifierClass(ModifierDyingWish)) {
            result.push(
              (() => {
                const result1 = [];
                for (var kwClass of Array.from<any>(card.getKeywordClasses())) {
                  if (kwClass.belongsToKeywordClass(ModifierDyingWish)) {
                    var manaModifier = ModifierManaCostChange.createContextObject(this.costChange);
                    this.getGameSession().applyModifierContextObject(manaModifier, card);
                    break;
                  } else {
                    result1.push(undefined);
                  }
                }
                return result1;
              })(),
            );
          } else {
            result.push(undefined);
          }
        }
        return result;
      })();
    }
  }
}
SpellLurkingFear.prototype.targetType = CardType.Unit;
SpellLurkingFear.prototype.spellFilterType = SpellFilterType.NeutralIndirect;
SpellLurkingFear.prototype.cardTypeToTarget = CardType.Unit;

module.exports = SpellLurkingFear;
