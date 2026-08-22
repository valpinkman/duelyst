/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const CardType = require('@duelyst/sdk/cards/cardType');
const _ = require('underscore');
const ModifierOpeningGambit = require('./modifierOpeningGambit');
const Modifier = require('./modifier');

/*
This modifier is used to apply modifiers entities around an entity on spawn.
examples:
All nearby friendly minions gain strikeback
All nearby enemy minions gain -2 attack
*/
class ModifierOpeningGambitApplyModifiers extends ModifierOpeningGambit {
  declare type: any;
  declare modifiersContextObjects: any;
  declare managedByCard: any;
  declare auraIncludeSelf: any;
  declare auraIncludeAlly: any;
  declare auraIncludeEnemy: any;
  declare auraIncludeGeneral: any;
  declare auraRadius: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitApplyModifiers';
  static description = '';

  static createContextObject(
    modifiersContextObjects,
    managedByCard,
    auraIncludeSelf,
    auraIncludeAlly,
    auraIncludeEnemy,
    auraIncludeGeneral,
    auraRadius,
    description,
    options,
  ) {
    if (managedByCard == null) {
      managedByCard = false;
    }
    if (auraIncludeSelf == null) {
      auraIncludeSelf = true;
    }
    if (auraIncludeAlly == null) {
      auraIncludeAlly = true;
    }
    if (auraIncludeEnemy == null) {
      auraIncludeEnemy = true;
    }
    if (auraIncludeGeneral == null) {
      auraIncludeGeneral = true;
    }
    if (auraRadius == null) {
      auraRadius = 1;
    }
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifiersContextObjects;
    contextObject.managedByCard = managedByCard;
    contextObject.auraIncludeAlly = auraIncludeAlly;
    contextObject.auraIncludeEnemy = auraIncludeEnemy;
    contextObject.auraIncludeSelf = auraIncludeSelf;
    contextObject.auraIncludeGeneral = auraIncludeGeneral;
    contextObject.auraRadius = auraRadius;
    contextObject.description = description;
    return contextObject;
  }

  static createContextObjectForAllUnitsAndGenerals(
    modifiersContextObjects,
    managedByCard,
    description,
    options,
  ) {
    return this.createContextObject(
      modifiersContextObjects,
      managedByCard,
      true,
      true,
      true,
      true,
      CONFIG.WHOLE_BOARD_RADIUS,
      description,
      options,
    );
  }

  static createContextObjectForAllies(
    modifiersContextObjects,
    managedByCard,
    auraRadius,
    description,
    options,
  ) {
    return this.createContextObject(
      modifiersContextObjects,
      managedByCard,
      false,
      true,
      false,
      false,
      auraRadius,
      description,
      options,
    );
  }

  static createContextObjectForNearbyAllies(
    modifiersContextObjects,
    managedByCard,
    description,
    options,
  ) {
    return this.createContextObject(
      modifiersContextObjects,
      managedByCard,
      false,
      true,
      false,
      false,
      1,
      description,
      options,
    );
  }

  static createContextObjectForAllAllies(
    modifiersContextObjects,
    managedByCard,
    description,
    options,
  ) {
    return this.createContextObject(
      modifiersContextObjects,
      managedByCard,
      false,
      true,
      false,
      false,
      CONFIG.WHOLE_BOARD_RADIUS,
      description,
      options,
    );
  }

  static createContextObjectForEnemies(
    modifiersContextObjects,
    managedByCard,
    auraRadius,
    description,
    options,
  ) {
    return this.createContextObject(
      modifiersContextObjects,
      managedByCard,
      false,
      false,
      true,
      false,
      auraRadius,
      description,
      options,
    );
  }

  static createContextObjectForNearbyEnemies(
    modifiersContextObjects,
    managedByCard,
    description,
    options,
  ) {
    return this.createContextObject(
      modifiersContextObjects,
      managedByCard,
      false,
      false,
      true,
      false,
      1,
      description,
      options,
    );
  }

  static createContextObjectForAllEnemies(
    modifiersContextObjects,
    managedByCard,
    description,
    options,
  ) {
    return this.createContextObject(
      modifiersContextObjects,
      managedByCard,
      false,
      false,
      true,
      false,
      CONFIG.WHOLE_BOARD_RADIUS,
      description,
      options,
    );
  }

  onOpeningGambit() {
    if (this.modifiersContextObjects != null) {
      return Array.from<any>(this.getAffectedEntities()).map((entity) =>
        Array.from<any>(this.modifiersContextObjects).map((modifierContextObject) =>
          this.managedByCard
            ? this.getGameSession().applyModifierContextObject(modifierContextObject, entity, this)
            : this.getGameSession().applyModifierContextObject(modifierContextObject, entity),
        ),
      );
    }
  }

  getAffectedEntities() {
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
        if (this.auraIncludeGeneral || !entity.getIsGeneral()) {
          affectedEntities.push(entity);
        }
      }
    }
    return affectedEntities;
  }
}
ModifierOpeningGambitApplyModifiers.prototype.type = 'ModifierOpeningGambitApplyModifiers';
ModifierOpeningGambitApplyModifiers.prototype.modifiersContextObjects = null;
ModifierOpeningGambitApplyModifiers.prototype.managedByCard = false;
ModifierOpeningGambitApplyModifiers.prototype.auraIncludeSelf = true;
ModifierOpeningGambitApplyModifiers.prototype.auraIncludeAlly = true;
ModifierOpeningGambitApplyModifiers.prototype.auraIncludeEnemy = true;
ModifierOpeningGambitApplyModifiers.prototype.auraIncludeGeneral = true;
ModifierOpeningGambitApplyModifiers.prototype.auraRadius = 1;
ModifierOpeningGambitApplyModifiers.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
  'FX.Modifiers.ModifierGenericBuff',
];

module.exports = ModifierOpeningGambitApplyModifiers;
