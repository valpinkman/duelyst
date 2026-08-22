/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifierEmblemGainMinionOrLoseControlWatch = require('./playerModifierEmblemGainMinionOrLoseControlWatch');
const ModifierQuestBuffVanar = require('@duelyst/sdk/modifiers/modifierQuestBuffVanar');
const CardType = require('@duelyst/sdk/cards/cardType');
const Rarity = require('@duelyst/sdk/cards/rarityLookup');

class PlayerModifierEmblemSummonWatchVanarTokenQuest extends PlayerModifierEmblemGainMinionOrLoseControlWatch {
  declare type: any;
  declare maxStacks: any;
  declare modifiersContextObjects: any;

  static type = 'PlayerModifierEmblemSummonWatchVanarTokenQuest';

  static createContextObject(modifiersContextObjects, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifiersContextObjects;
    return contextObject;
  }

  onGainMinionWatch(action) {
    const unit = action.getTarget();
    if (
      unit != null &&
      this.modifiersContextObjects != null &&
      unit.getRarityId() === Rarity.TokenUnit
    ) {
      return (() => {
        const result = [];
        for (var modifiersContextObject of Array.from<any>(this.modifiersContextObjects)) {
          if (modifiersContextObject != null) {
            modifiersContextObject.isRemovable = false;
            result.push(
              this.getGameSession().applyModifierContextObject(modifiersContextObject, unit),
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
            if (modifier instanceof ModifierQuestBuffVanar) {
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
            unit.getRarityId() === Rarity.TokenUnit
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
PlayerModifierEmblemSummonWatchVanarTokenQuest.prototype.type =
  'PlayerModifierEmblemSummonWatchVanarTokenQuest';
PlayerModifierEmblemSummonWatchVanarTokenQuest.prototype.maxStacks = 1;
PlayerModifierEmblemSummonWatchVanarTokenQuest.prototype.modifiersContextObjects = null;

module.exports = PlayerModifierEmblemSummonWatchVanarTokenQuest;
