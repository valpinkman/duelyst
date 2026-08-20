/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const UtilsGameSession = require('app/common/utils/utils_game_session');
const CardType = require('app/sdk/cards/cardType');
const _ = require('underscore');
const ModifierDyingWish = require('./modifierDyingWish');
const Modifier = require('./modifier');

class ModifierDyingWishApplyModifiers extends ModifierDyingWish {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierDyingWishApplyModifiers';
  static description = '';

  static createContextObject(
    modifiersContextObjects,
    auraIncludeSelf,
    auraIncludeAlly,
    auraIncludeEnemy,
    auraRadius,
    canTargetGeneral,
    description,
    options,
  ) {
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifiersContextObjects;
    contextObject.auraIncludeAlly = auraIncludeAlly;
    contextObject.auraIncludeEnemy = auraIncludeEnemy;
    contextObject.auraIncludeSelf = auraIncludeSelf;
    contextObject.auraRadius = auraRadius;
    contextObject.canTargetGeneral = canTargetGeneral;
    contextObject.description = description;
    return contextObject;
  }

  onDyingWish(action) {
    if (this.modifiersContextObjects != null) {
      return Array.from<any>(this.getAffectedEntities()).map((entity) =>
        Array.from<any>(this.modifiersContextObjects).map((modifierContextObject) =>
          this.getGameSession().applyModifierContextObject(modifierContextObject, entity),
        ),
      );
    }
  }

  getAffectedEntities(action) {
    const entityList = this.getGameSession()
      .getBoard()
      .getCardsWithinRadiusOfPosition(
        this.getCard().position,
        this.auraFilterByCardType,
        this.auraRadius,
        this.auraIncludeSelf,
      );
    const affectedEntities = [];
    for (var entity of Array.from<any>(entityList)) {
      if (
        (this.auraIncludeAlly && entity.getIsSameTeamAs(this.getCard())) ||
        (this.auraIncludeEnemy && !entity.getIsSameTeamAs(this.getCard()))
      ) {
        if (this.canTargetGeneral || !entity.getIsGeneral()) {
          affectedEntities.push(entity);
        }
      }
    }
    return affectedEntities;
  }
}
ModifierDyingWishApplyModifiers.prototype.type = 'ModifierDyingWishApplyModifiers';
ModifierDyingWishApplyModifiers.prototype.fxResource = [
  'FX.Modifiers.ModifierDyingWish',
  'FX.Modifiers.ModifierGenericBuff',
];

module.exports = ModifierDyingWishApplyModifiers;
