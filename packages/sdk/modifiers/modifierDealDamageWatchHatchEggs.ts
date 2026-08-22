/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierEgg = require('@duelyst/sdk/modifiers/modifierEgg');
const ModifierDealDamageWatch = require('./modifierDealDamageWatch');

class ModifierDealDamageWatchHatchEggs extends ModifierDealDamageWatch {
  declare type: any;

  static type = 'ModifierDealDamageWatchHatchEggs';
  static modifierName = 'Deal Damage and hatch eggs';
  static description = 'Whenever this deals damage, hatch all friendly eggs';

  onDealDamage(action) {
    return (() => {
      const result = [];
      for (var entity of Array.from<any>(this.getCard().getGameSession().getBoard().getUnits())) {
        if (
          (entity != null ? entity.getOwnerId() : undefined) === this.getCard().getOwnerId() &&
          entity.hasModifierClass(ModifierEgg)
        ) {
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
ModifierDealDamageWatchHatchEggs.prototype.type = 'ModifierDealDamageWatchHatchEggs';

module.exports = ModifierDealDamageWatchHatchEggs;
