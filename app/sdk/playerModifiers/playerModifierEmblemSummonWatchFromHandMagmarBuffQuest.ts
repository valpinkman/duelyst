/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifierEmblemSummonWatch = require('./playerModifierEmblemSummonWatch');
const CardType = require('app/sdk/cards/cardType');
const PlayCardFromHandAction = require('app/sdk/actions/playCardFromHandAction');

class PlayerModifierEmblemSummonWatchFromHandMagmarBuffQuest extends PlayerModifierEmblemSummonWatch {
  declare type: any;
  declare maxStacks: any;
  declare modifiersContextObjects: any;

  static type = 'PlayerModifierEmblemSummonWatchFromHandMagmarBuffQuest';

  static createContextObject(modifiersContextObjects, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifiersContextObjects;
    return contextObject;
  }

  onSummonWatch(action) {
    if (action instanceof PlayCardFromHandAction) {
      const entity = action.getTarget();
      if (entity != null && this.modifiersContextObjects != null) {
        return (() => {
          const result = [];
          for (var modifiersContextObject of Array.from<any>(this.modifiersContextObjects)) {
            if (modifiersContextObject != null) {
              modifiersContextObject.isRemovable = false;
              // Set this parent of buff, so it's known the modifier originates from an emblem
              result.push(
                this.getGameSession().applyModifierContextObject(
                  modifiersContextObject,
                  entity,
                  this,
                ),
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
}
PlayerModifierEmblemSummonWatchFromHandMagmarBuffQuest.prototype.type =
  'PlayerModifierEmblemSummonWatchFromHandMagmarBuffQuest';
PlayerModifierEmblemSummonWatchFromHandMagmarBuffQuest.prototype.maxStacks = 1;
PlayerModifierEmblemSummonWatchFromHandMagmarBuffQuest.prototype.modifiersContextObjects = null;

module.exports = PlayerModifierEmblemSummonWatchFromHandMagmarBuffQuest;
