/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Cards = require('app/sdk/cards/cardsLookup');
const CardType = require('app/sdk/cards/cardType');
const DamageAction = require('app/sdk/actions/damageAction');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitDamageEnemiesNearShadowCreep extends ModifierOpeningGambit {
  static type = 'ModifierOpeningGambitDamageEnemiesNearShadowCreep';
  static modifierName = 'Opening Gambit';
  static description = 'Deal %X damage to each enemy on or near friendly Shadow Creep';

  static createContextObject(damageAmount, options) {
    if (damageAmount == null) { damageAmount = 0; }
    if (options == null) { options = undefined; }
    const contextObject = super.createContextObject(options);
    contextObject.damageAmount = damageAmount;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject != null) {
      return this.description.replace(/%X/, modifierContextObject.damageAmount);
    }
    return this.description;
  }

  onOpeningGambit() {
    let unit;
    super.onOpeningGambit();
    const unitsToDamage = [];
    const board = this.getGameSession().getBoard();
    for (unit of Array.from(board.getEnemyEntitiesForEntity(this.getCard()))) {
      var tileAtPosition = board.getTileAtPosition(unit.getPosition(), true);
      if ((tileAtPosition != null) && (tileAtPosition.getBaseCardId() === Cards.Tile.Shadow) && (tileAtPosition.getOwnerId() === this.getCard().getOwnerId())) {
        unitsToDamage.push(unit);
      } else {
        for (var cardAroundUnit of Array.from(board.getEnemyEntitiesAroundEntity(unit, CardType.Tile, 1, true))) {
          if (cardAroundUnit.getBaseCardId() === Cards.Tile.Shadow) {
            unitsToDamage.push(unit);
            break;
          }
        }
      }
    }
    return (() => {
      const result = [];
      for (unit of Array.from(unitsToDamage)) {
        var damageAction = new DamageAction(this.getGameSession());
        damageAction.setOwnerId(this.getCard().getOwnerId());
        damageAction.setSource(this.getCard());
        damageAction.setTarget(unit);
        damageAction.setDamageAmount(this.damageAmount);
        result.push(this.getGameSession().executeAction(damageAction));
      }
      return result;
    })();
  }
}
ModifierOpeningGambitDamageEnemiesNearShadowCreep.prototype.type = 'ModifierOpeningGambitDamageEnemiesNearShadowCreep';
ModifierOpeningGambitDamageEnemiesNearShadowCreep.prototype.fxResource = ['FX.Modifiers.ModifierOpeningGambit', 'FX.Modifiers.ModifierGenericDamage'];

module.exports = ModifierOpeningGambitDamageEnemiesNearShadowCreep;
