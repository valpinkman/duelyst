/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifierEmblemGainMinionOrLoseControlWatch = require('./playerModifierEmblemGainMinionOrLoseControlWatch');
const ModifierQuestBuffAbyssian = require('app/sdk/modifiers/modifierQuestBuffAbyssian');
const CardType = require('app/sdk/cards/cardType');

class PlayerModifierEmblemSummonWatchAbyssUndyingQuest extends PlayerModifierEmblemGainMinionOrLoseControlWatch {
  declare type: any;
  declare maxStacks: any;
  declare modifiersContextObjects: any;

  static type = 'PlayerModifierEmblemSummonWatchAbyssUndyingQuest';

  static createContextObject(modifiersContextObjects, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifiersContextObjects;
    return contextObject;
  }

  onGainMinionWatch(action) {
    const entity = action.getTarget();
    if (entity != null && this.modifiersContextObjects != null) {
      return (() => {
        const result = [];
        for (var modifiersContextObject of Array.from<any>(this.modifiersContextObjects)) {
          if (modifiersContextObject != null) {
            modifiersContextObject.isRemovable = false;
            result.push(
              this.getGameSession().applyModifierContextObject(modifiersContextObject, entity),
            );
          } else {
            result.push(undefined);
          }
        }
        return result;
      })();
    }
  }

  onLoseControlWatch(action) {
    const entity = action.getTarget();
    if (entity != null) {
      const modifiers = entity.getModifiers();
      if (modifiers != null) {
        return (() => {
          const result = [];
          for (var modifier of Array.from<any>(modifiers)) {
            if (modifier instanceof ModifierQuestBuffAbyssian) {
              result.push(this.getGameSession().removeModifier(modifier));
            } else {
              result.push(undefined);
            }
          }
          return result;
        })();
      }
    }
  }

  onActivate() {
    super.onActivate();
    if (this.modifiersContextObjects != null) {
      return (() => {
        const result = [];
        for (var unit of Array.from<any>(
          this.getGameSession().getBoard().getFriendlyEntitiesForEntity(this.getCard()),
        )) {
          if (
            unit != null &&
            !unit.getIsGeneral() &&
            unit.getType() === CardType.Unit &&
            unit !== this.getSourceCard()
          ) {
            result.push(
              (() => {
                const result1 = [];
                for (var modifier of Array.from<any>(this.modifiersContextObjects)) {
                  if (modifier != null) {
                    modifier.isRemovable = false;
                    result1.push(this.getGameSession().applyModifierContextObject(modifier, unit));
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
PlayerModifierEmblemSummonWatchAbyssUndyingQuest.prototype.type =
  'PlayerModifierEmblemSummonWatchAbyssUndyingQuest';
PlayerModifierEmblemSummonWatchAbyssUndyingQuest.prototype.maxStacks = 1;
PlayerModifierEmblemSummonWatchAbyssUndyingQuest.prototype.modifiersContextObjects = null;

module.exports = PlayerModifierEmblemSummonWatchAbyssUndyingQuest;
