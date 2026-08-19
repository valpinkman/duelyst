/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierEgg = require('app/sdk/modifiers/modifierEgg');
const ModifierOpeningGambit = require('app/sdk/modifiers/modifierOpeningGambit');

class ModifierOpeningGambitHatchFriendlyEggs extends ModifierOpeningGambit {
  static type = 'ModifierOpeningGambitHatchFriendlyEggs';
  static description = 'Hatch all friendly eggs';

  onOpeningGambit() {
    return (() => {
      const result = [];
      for (var entity of Array.from(this.getCard().getGameSession().getBoard().getUnits())) {
        if (((entity != null ? entity.getOwnerId() : undefined) === this.getCard().getOwnerId()) && entity.hasModifierClass(ModifierEgg)) {
          var eggModifier = entity.getModifierByType(ModifierEgg.type);
          this.getGameSession().pushTriggeringModifierOntoStack(eggModifier);
          eggModifier.removeAndReplace();
          result.push(this.getGameSession().popTriggeringModifierFromStack());
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
}
ModifierOpeningGambitHatchFriendlyEggs.prototype.type = 'ModifierOpeningGambitHatchFriendlyEggs';
ModifierOpeningGambitHatchFriendlyEggs.prototype.fxResource = ['FX.Modifiers.ModifierOpeningGambit'];

module.exports = ModifierOpeningGambitHatchFriendlyEggs;
