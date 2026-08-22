/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const CardType = require('@duelyst/sdk/cards/cardType');
const Modifier = require('./modifier');
const ModifierMyMoveWatch = require('./modifierMyMoveWatch');

class ModifierMyMoveWatchApplyModifiers extends ModifierMyMoveWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierMyMoveWatchApplyModifiers';
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

  onMyMoveWatch(action) {
    if (this.modifiersContextObjects != null) {
      return Array.from<any>(this.getAffectedEntities()).map((entity) =>
        Array.from<any>(this.modifiersContextObjects).map((modifierContextObject) =>
          this.getGameSession().applyModifierContextObject(modifierContextObject, entity),
        ),
      );
    }
  }

  getAffectedEntities(action?) {
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
ModifierMyMoveWatchApplyModifiers.prototype.type = 'ModifierMyMoveWatchApplyModifiers';
ModifierMyMoveWatchApplyModifiers.prototype.fxResource = [
  'FX.Modifiers.ModifierMyMoveWatch',
  'FX.Modifiers.ModifierGenericBuff',
];

module.exports = ModifierMyMoveWatchApplyModifiers;
