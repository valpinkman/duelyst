/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const CONFIG = require('app/common/config');
const ModifierOpeningGambit = require('./modifierOpeningGambit');
const ModifierSilence = require('./modifierSilence');

class ModifierOpeningGambitDispel extends ModifierOpeningGambit {
  declare type: any;

  static type = 'ModifierOpeningGambitDispel';
  static modifierName = 'Opening Gambit';
  static description = 'Dispel ALL spaces around it';

  onOpeningGambit() {
    const entities = this.getGameSession()
      .getBoard()
      .getCardsWithinRadiusOfPosition(
        this.getCard().getPosition(),
        CardType.Entity,
        1,
        false,
        true,
      );
    return Array.from<any>(entities).map((entity) =>
      this.getGameSession().applyModifierContextObject(
        ModifierSilence.createContextObject(),
        entity,
      ),
    );
  }
}
ModifierOpeningGambitDispel.prototype.type = 'ModifierOpeningGambitDispel';

module.exports = ModifierOpeningGambitDispel;
