/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Modifier = require('./modifier');

class ModifierExpireApplyModifiers extends Modifier {
  declare type: any;
  declare modifiersContextObjects: any;

  static type = 'ModifierExpireApplyModifiers';
  static modifierName = '';
  static description = '';

  static createContextObject(
    modifiersContextObjects,
    durationEndTurn,
    durationStartTurn,
    auraIncludeSelf,
    auraIncludeAlly,
    auraIncludeEnemy,
    auraRadius,
    canTargetGeneral,
    description,
    options,
  ) {
    if (durationEndTurn == null) {
      durationEndTurn = 1;
    }
    if (durationStartTurn == null) {
      durationStartTurn = 0;
    }
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifiersContextObjects;
    contextObject.durationEndTurn = durationEndTurn;
    contextObject.durationStartTurn = durationStartTurn;
    contextObject.auraIncludeAlly = auraIncludeAlly;
    contextObject.auraIncludeEnemy = auraIncludeEnemy;
    contextObject.auraIncludeSelf = auraIncludeSelf;
    contextObject.auraRadius = auraRadius;
    contextObject.canTargetGeneral = canTargetGeneral;
    contextObject.description = description;
    return contextObject;
  }

  onExpire() {
    super.onExpire();

    if (this.modifiersContextObjects != null) {
      return Array.from<any>(this.getAffectedEntities()).map((entity) =>
        Array.from<any>(this.modifiersContextObjects).map((modifierContextObject) =>
          this.getGameSession().applyModifierContextObject(modifierContextObject, entity),
        ),
      );
    }
  }

  getAffectedEntities() {
    const entityList = this.getGameSession()
      .getBoard()
      .getCardsWithinRadiusOfPosition(
        this.getCard().getPosition(),
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
ModifierExpireApplyModifiers.prototype.type = 'ModifierExpireApplyModifiers';
ModifierExpireApplyModifiers.prototype.modifiersContextObjects = null;

module.exports = ModifierExpireApplyModifiers;
